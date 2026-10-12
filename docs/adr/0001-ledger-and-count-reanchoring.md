# 0001. One ledger, void by reversing entry, counts that re-anchor

Status: accepted (implemented in `app/motor.py` and `app/operaciones.py`).

## Context

The agency's seven paper notebooks copy the same figures from one to the next to close each
box and then the day. The field survey found three things that shape the design:

- Three of the notebooks are derived data (a running total, the day's book, the day's
  summary), not original records.
- The main box's morning count is off by tens to a few hundred pesos on 5 of 6 photographed
  days. The staff write the difference down and never correct it.
- When a credit customer pays in the same shift, the credit sale is crossed out by hand so
  it is not copied forward as unpaid.

## Decision

1. **One table, `movimiento`.** Every entry is a row. The movement type fixes its effect on
   cash, prize tickets (`boletas`) and customer debt (`EFECTOS`, `app/motor.py:8`). Box
   balances, customer debt and reports are computed from the rows and never stored.
2. **No edits, no deletes.** Voiding inserts a copy of the movement with `anula_id` and
   `motivo_anulacion` (`_contra`, `app/operaciones.py:84`). The motor inverts the effect of
   a row that has `anula_id`, so the pair sums to zero.
3. **A count is always saved.** `guardar_arqueo` stores expected, counted and two
   differences (cash and tickets, so a cash shortfall and a ticket surplus of the same
   amount do not hide each other). The count closes only if both differences are zero.
4. **Each count re-anchors the box.** The next expected value starts from what was counted
   (`control`, `app/operaciones.py:45`), so a shortfall is recorded once and not carried
   into every later count.
5. **Late entries explain, they do not rewrite.** A late entry is saved as an adjustment
   (`es_ajuste`) dated to the day it belongs to. It does not change today's expected value.
   If it matches an earlier difference exactly, that count moves from `con_diferencia` to
   `explicada` (`motor.estado`).

## Alternatives

- **Stored running balance per box, editable rows.** It is how the notebooks work. An edit
  erases the trail that explains a difference.
- **Carry the difference into the next count.** One shortfall would contaminate every count
  until the month closes.
- **Refuse to save a count that does not close.** The survey shows differences are normal,
  so staff would have to invent a number or keep no record.
- **One screen per notebook.** Three of the seven are derived data and became reports.

## Consequences

- Each expected value is computed from the movements since the last count: one query per
  box on every ticket and every count. At the simulated month's 1,703 movements this is not
  a problem, but it was not measured under load.
- Voiding a movement from before a later count is recorded as an adjustment, so that the
  later count, which already absorbed the movement, keeps its expected value.
- Sales (`apuesta_quiniela`, `venta_otro_juego`), transfers and the prize-ticket batch
  cannot be voided: sales are corrected by reloading the terminal ticket
  (`app/operaciones.py:177`).
- The effect table lives in Python. A test asserts it covers exactly the movement types the
  models accept (`tests/test_motor.py::test_todo_tipo_que_acepta_la_base_tiene_efecto`).
