# 0002. The assistant reads and words; the code computes

Status: accepted (implemented in `app/asistente/` and `app/routers/asistente.py`).

## Context

The assistant answers the operator at the counter ("how much does this customer owe?") and
explains a cash count that does not close. A wrong figure here costs money, and a customer
name or a note is free text that anyone with a login can write.

## Decision

- **Direct tool use, one manual loop** (`responder`, `app/asistente/__init__.py:59`) on the
  Anthropic SDK, with model `claude-sonnet-5-5` set once in `MODELO` (line 13).
- **Six read-only tools** over `app/consultas.py` (`app/asistente/tools.py`). No tool
  writes, voids or corrects.
- **`negocio_id` is not a tool input.** The code takes it from the session and passes it to
  every tool.
- **The diagnosis is built in Python.** When the request carries an `arqueo_id`,
  `diagnosticar_arqueo` computes the candidates (movements for the exact difference,
  movement types usually present and missing, how the difference compares with earlier
  ones) and the model only words them.
- **Data is kept apart from instructions.** Names, notes and counterparties arrive in
  `tool_result` blocks or inside `<diagnostico>`, and the system prompt says they are data.
  The code escapes `<` in the question and the diagnosis so a pasted closing tag cannot end
  the block early.
- **Cost caps in code:** question up to 500 characters, 5 turns, 10 tool calls, 60,000
  input tokens per turn, `max_tokens` 2,000, API timeout 30 s with one retry.

## Alternatives

- **An agent framework (LangGraph).** Six read tools and one loop do not need it.
- **Let the model add figures.** An arithmetic slip would reach the cash counter. Balances
  and differences already exist as tested code.
- **Write tools ("fix this for me").** The operator decides; the assistant suggests.
- **Free hosted or local models.** The free tiers of Gemini, Groq and OpenRouter and a
  local model were evaluated and dropped: Gemini's free tier trains on the data sent to it,
  open models were weaker with tools, and the free hosting plan cannot run a model.

## Consequences

- "Do not compute money" is enforced by the system prompt only. Nothing compares the
  figures in an answer with the tool output, and there is no eval set (see the LLM section
  of the README).
- The assistant has no memory: each question stands alone and the screen keeps the
  conversation in browser memory. A follow-up such as "and last week?" has no context.
- The loop, its caps and its error handling are the project's own code (77 lines plus 161
  of tools).
- One provider and a paid API key. The measured cost is in the README.
