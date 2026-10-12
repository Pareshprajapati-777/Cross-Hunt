import os
from openai import OpenAI

# Configure your OPENAI_API_KEY as an environment variable or pass here
client = OpenAI(
  api_key=os.environ.get("OPENAI_API_KEY", "your-api-key-here")
)

response = client.responses.create(
  model="gpt-4o-mini",
  input="write a haiku about ai",
  store=True,
)

print(response.output_text)
