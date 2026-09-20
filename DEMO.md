# Adios — 3-minute demo script

Covers the three judging pillars: **useful product**, **AWS implementation**,
**what we learned**.

## Before recording

```bash
pkill -f scripts/local_server.py   # kill any old instance
rm -rf .local_data                  # clean slate
make run                            # starts fresh, seeds 3 already-due patients
```

Leave this terminal visible — the auto-reminder firing live is your best
"wow" moment and costs you nothing to show.

Keep a second terminal ready for `curl` commands.

---

## 0:00–0:30 — The problem (useful product)

**Say:**
> "Doctors juggling follow-ups today rely on memory, sticky notes, or a
> calendar reminder they set themselves. If they forget, the patient never
> gets checked on. And when a patient does call back weeks later, the
> doctor has to reconstruct their condition from scattered notes or memory.
> Adios fixes both: it tracks a short note per visit, and it automatically
> notifies the patient when a follow-up is due — no one has to remember."

Show the terminal running `make run` — point out the 4 seeded patients and,
within the first few seconds, the `[followup-watcher]` lines firing for
Asha, Meera, and Rohan automatically. That's the core promise happening
live, unscripted.

## 0:30–1:45 — Live walkthrough (product in action)

Run these in the second terminal (swap in your own printed `patient_id`):

```bash
# 1. A doctor looks up a patient and their note history before a call
curl -s -H "X-Doctor-Id: dr_mehta" http://localhost:8000/patients/<patient_id> | python3 -m json.tool
curl -s -H "X-Doctor-Id: dr_mehta" http://localhost:8000/patients/<patient_id>/notes | python3 -m json.tool

# 2. Search that history instead of scrolling
curl -s -H "X-Doctor-Id: dr_mehta" "http://localhost:8000/patients/<patient_id>/notes?q=swelling" | python3 -m json.tool

# 3. Add a note after today's consultation
curl -s -X POST -H "X-Doctor-Id: dr_mehta" -H "Content-Type: application/json" \
  -d '{"text":"Follow-up call: patient doing well, no further action needed."}' \
  http://localhost:8000/patients/<patient_id>/notes | python3 -m json.tool

# 4. Schedule the NEXT follow-up
curl -s -X POST -H "X-Doctor-Id: dr_mehta" -H "Content-Type: application/json" \
  -d '{"durationDays":7}' \
  http://localhost:8000/patients/<patient_id>/followups | python3 -m json.tool

# 5. Access control isn't decorative - a different doctor is denied
curl -s -H "X-Doctor-Id: dr_khan" http://localhost:8000/patients/<patient_id> -w "\nHTTP:%{http_code}\n"
```

**Say while #5 runs:**
> "Patient notes are sensitive - Dr. Khan isn't Asha's doctor, so he's
> denied. That's not an if-check I wrote by hand in this one endpoint - it's
> a policy, enforced everywhere, automatically."

## 1:45–2:20 — The AWS stack (show the actual code, not a table)

Have these three files already open in editor tabs before you start recording,
so you just switch tabs on camera instead of navigating live.

**Tab 1 — `infra/template.yaml`** (scroll to show, ~8s)
- Lines 23, 35, 51: three `AWS::DynamoDB::Table` resources (patients, notes, follow-ups)
- Lines 63-124: `AWS::Serverless::Function` blocks - real Lambda handlers behind API Gateway
- Line 132: `AWS::Serverless::StateMachine` - the Step Functions definition

> "This is a real SAM template - DynamoDB tables, Lambda functions behind API
> Gateway, and a Step Functions state machine. It deploys to LocalStack today
> and to real AWS with the same file tomorrow."

**Tab 2 — `src/adios/auth/policies.cedar`** (whole file is 42 lines, show it all, ~10s)

> "This one file is the entire access-control system. `resource.doctor ==
> principal` - a doctor can only touch their own patients. Cedar evaluates
> this on every request."

**Tab 3 — `src/adios/agent/followup_agent.py`, lines 17-33** (~10s)

```python
from strands.models.ollama import OllamaModel
from strands.vended_interventions.cedar import CedarAuthorization
...
def build_agent() -> Agent:
    cedar = CedarAuthorization(policies=_POLICIES, principal={"type": "Agent", "id": "followup_bot"})
    model = OllamaModel(host=OLLAMA_HOST, model_id=OLLAMA_MODEL_ID)
    return Agent(
        ...
        tools=[tools.get_patient_notes, tools.send_notification],
```

> "The reminder agent is built on the Strands Agents SDK, and it's wired to
> the exact same Cedar policy file you just saw. Every tool call it makes -
> reading notes, sending a message - is checked against that policy before
> it runs. We built this entirely on the Build It track: LocalStack instead
> of DynamoDB and Step Functions, SAM CLI instead of deployed Lambda, Ollama
> instead of Bedrock, OpenSearch and Cedar running locally. Same code either
> way - only the endpoint changes for a real AWS deployment."

## 2:20–3:00 — What we learned

**Say (pick 2-3, don't rush all of them):**
> - "We learned that AI agents shouldn't be trusted by prompt alone - Cedar
>   lets us enforce, as policy, exactly what our reminder agent is allowed
>   to do, independent of what the model decides to try."
> - "Step Functions' Wait state turned out to be the right primitive for
>   'come back to this in N days' - we didn't need to build or run our own
>   scheduler."
> - "Designing every layer (DynamoDB, OpenSearch) with a local fallback
>   meant our demo never broke, even when infra wasn't running - which
>   mattered a lot given how little time we had."
> - "The Build It -> Ship It path is real, not just marketing: the same
>   handler code, same Cedar policy, same agent - only the endpoint changes
>   when we're ready to deploy for real."

**Close:**
> "This is our MVP - notes, follow-ups, automatic reminders, and access
> control that's actually enforced. Next we'd add real doctor sign-in, a
> proper UI, and a patient-facing reply channel."

---

## If something breaks mid-recording

- Server not responding: it's still running in the background from before -
  check the terminal, or `make run` again (safe, re-seeds fresh data).
- Wrong patient ID: re-read them from the top of the `make run` output.
- Watcher hasn't fired yet: it checks every 5s - just wait a beat before
  cutting to that part in editing.
