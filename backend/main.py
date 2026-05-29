import os
import json
import re
import io
import fitz  # pymupdf
import anthropic

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a legal document analyst. You are not a lawyer and do not provide legal advice.
Analyze the provided contract and return ONLY valid JSON matching the schema below.
No preamble, no markdown, no explanation outside the JSON.

Standard practices reference:
- NDA: Mutual confidentiality obligations, 1-2 year term, reasonable scope limitations, no overly broad IP assignment, clear carve-outs for public information.
- Employment agreement: Clear compensation, benefits, at-will or fixed term stated, reasonable non-compete scope and duration (if any), IP assignment limited to work-related inventions.
- Internship offer: Paid unless meeting strict unpaid criteria, clear start/end dates, no overly broad IP or NDA clauses, no non-compete for interns.
- Lease: Security deposit capped at 2 months, landlord entry notice (24-48 hours), clear maintenance responsibilities, no waiver of habitability warranty.

Schema:
{
  "contract_type": string,
  "risk_score": integer (0-100, higher = riskier),
  "risk_verdict": string,
  "risk_categories": [{ "label": string, "level": "high" | "medium" | "ok" }],
  "key_terms": [{ "label": string, "value": string }],
  "flags": [
    {
      "severity": "high" | "medium" | "low",
      "title": string,
      "issue": string,
      "standard_practice": string,
      "clause_text": string
    }
  ],
  "suggested_questions": [string]
}

key_terms must always include: contract type, parties, effective date, duration, governing law, dispute resolution, expiry date, auto-renewal (yes/no + terms), termination notice period.
suggested_questions must be exactly 3 questions specific to the flags found.
risk_score based on number and severity of flags and deviation from standard practices."""


def extract_json(text: str) -> dict:
    text = text.strip()
    # strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def run_analysis(contract_text: str) -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this contract:\n\n{contract_text}",
            }
        ],
    )
    raw = message.content[0].text
    try:
        return extract_json(raw)
    except json.JSONDecodeError:
        # retry once
        retry = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this contract:\n\n{contract_text}",
                },
                {"role": "assistant", "content": raw},
                {
                    "role": "user",
                    "content": "Your response was not valid JSON. Return only the JSON object, nothing else.",
                },
            ],
        )
        return extract_json(retry.content[0].text)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit.")

    try:
        doc = fitz.open(stream=contents, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse PDF.")

    page_count = len(doc)
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    contract_text = "\n\n".join(text_parts).strip()

    if not contract_text:
        raise HTTPException(status_code=422, detail="PDF appears to contain no extractable text.")

    try:
        analysis = run_analysis(contract_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned malformed JSON after retry.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {str(e)}")

    return {
        "page_count": page_count,
        "contract_text": contract_text,
        "analysis": analysis,
    }
