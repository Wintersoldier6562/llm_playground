from pydantic import BaseModel

class CompareRequest(BaseModel):
    prompt: str 