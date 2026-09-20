# Arcane — demo script

Two ways to demo, pick one:

- **CLI demo** (recommended, fastest, no timing risk) - `make cli`
- **API demo** - `make run` + curl, shown live via the server logs

Both can run in **fast mode** (templated reminder, instant) or **live LLM
mode** (`ADIOS_USE_LLM=1`, the agent's model actually drafts the message,
takes ~30-60s per reminder on CPU with `gemma4:e2b`). If you're short on
time, use fast mode - it's the same Cedar enforcement, just no wait.

---

## Option A — CLI demo (~2 minutes)

```bash
rm -rf .local_data
make cli
```

Pick doctor `1` (Dr. Priya Mehta). Every row below is ONE thing to type at
the prompt that's currently showing - the menu and the "pick a patient"
prompt are different prompts, don't type both numbers at the same one.

**1. View my patients**
```
> 1
```
Shows both patients with a note history already on file. Enter to continue.

**2. View Asha Rao's note history**
```
> 3
Pick a number> 1
```
(`3` = menu choice "View a patient's note history"; `1` = Asha Rao in the
list that appears next - she's always #1 for Dr. Mehta.) Shows her full
history - the "fast context before a call" pitch. Enter to continue.

**3. Search her notes**
```
> 5
Pick a number> 1
Search for: swelling
```
Shows only the matching notes. Enter to continue.

**4. Add a note for Vikram Nair**
```
> 4
Pick a number> 2
Note for Vikram Nair: Feeling much better, stiffness gone.
```
Enter to continue.

**5. Run the guarded agent** - the main event
```
> 7
```
No sub-prompt needed here - it processes whatever's due for this doctor.
Prints `[Cedar] get_patient_notes -> allowed`, then
`[Cedar] send_notification(...) -> Cedar ALLOWED`, then the actual message
sent. Enter to continue.

**6. Schedule a follow-up due right now, then fire it live**
```
> 6
Pick a number> 1
Check back on Asha Rao in how many days? (0 = right now, for a demo) 0
```
Enter to continue, then repeat step 5 (`> 7`) to show it firing on demand,
not just from the seed data.

**Say over step 5:**
> "This is the Strands Agent - it reads this patient's notes, and every
> single tool call it makes is checked against a Cedar policy before it
> runs. It's allowed to read notes and send one specific kind of message -
> a follow-up reminder - and nothing else."

To show the **live model** instead of the template, quit (`0`) and restart with:
```bash
rm -rf .local_data
ADIOS_USE_LLM=1 make cli
```
Same steps, but step 5 now streams `Tool #1: get_patient_notes` /
`Tool #2: send_notification` live as the model actually reasons - takes
~30-60s, so only do this if you have the time and want to prove it's a real
model, not a script.

---

## Option B — API demo (curl, ~2 minutes)

```bash
pkill -f scripts/local_server.py
rm -rf .local_data
make run
```

Copy a `patient_id` from the startup output, then in a second terminal:

```bash
# look up a patient + notes
curl -s -H "X-Doctor-Id: dr_mehta" http://localhost:8000/patients/<patient_id> | python3 -m json.tool
curl -s -H "X-Doctor-Id: dr_mehta" http://localhost:8000/patients/<patient_id>/notes | python3 -m json.tool

# search notes
curl -s -H "X-Doctor-Id: dr_mehta" "http://localhost:8000/patients/<patient_id>/notes?q=swelling" | python3 -m json.tool

# add a note
curl -s -X POST -H "X-Doctor-Id: dr_mehta" -H "Content-Type: application/json" \
  -d '{"text":"Follow-up call: doing well."}' \
  http://localhost:8000/patients/<patient_id>/notes | python3 -m json.tool

# a different doctor is denied - Cedar, not an if-check
curl -s -H "X-Doctor-Id: dr_khan" http://localhost:8000/patients/<patient_id> -w "\nHTTP:%{http_code}\n"
```

Point at the terminal running `make run` - within 5s of startup you'll see
`[followup-watcher]` lines fire automatically for the seeded due patients.
That's the Cedar-guarded agent running unprompted. For the live-model
version: `ADIOS_USE_LLM=1 make run` instead (the startup banner confirms
which mode is active).

---

## Show the code (30s, no table needed)

Open these three files as tabs beforehand:

1. **`infra/template.yaml`** - DynamoDB tables, Lambda functions, the Step
   Functions state machine (line 132) - a real SAM template.
2. **`src/adios/auth/policies.cedar`** - the whole 42-line access-control
   policy, in one file.
3. **`src/adios/agent/followup_agent.py` (lines 17-33)** - `CedarAuthorization`
   + `OllamaModel` wiring the agent to that same policy file.

> "Built entirely on the Build It track - LocalStack instead of DynamoDB and
> Step Functions, SAM CLI instead of deployed Lambda, Ollama instead of
> Bedrock. Same code, same Cedar policy, same agent - only the endpoint
> changes for real AWS."

## What we learned (pick 2, don't rush)

- AI agents shouldn't be trusted by prompt alone - Cedar enforces what ours
  can do as policy, independent of what the model decides to try.
- Step Functions' `Wait` state is the right primitive for "come back to this
  in N days" - no scheduler to build or run.
- Every layer having a local fallback meant the demo never broke, even with
  no infra running.

## If something breaks mid-recording

- `ModuleNotFoundError`: `pip install -r requirements.txt`.
- OpenSearch/DynamoDB warnings in the log: expected, harmless, it's using
  the local fallback - not a failure.
- Live LLM mode seems stuck: it takes 30-60s, that's normal on CPU - use
  fast mode if you're out of time.
