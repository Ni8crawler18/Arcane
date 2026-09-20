# Arcane — walkthrough script

```bash
rm -rf .local_data
make cli
```

Pick doctor `1` (Dr. Priya Mehta). Every row below is ONE thing to type at
the prompt currently showing - the menu and the "pick a patient" prompt are
different prompts, don't type both numbers at the same one.

The startup listing prints every patient's ID across BOTH doctors - copy one
before you start, you'll need a Dr. Khan patient_id for step 6.

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
(`3` = "View a patient's note history"; `1` = Asha Rao - she's always #1 for
Dr. Mehta.) Enter to continue.

**3. Search her notes**
```
> 5
Pick a number> 1
Search for: swelling
```
Enter to continue.

**4. Add a note for Vikram Nair**
```
> 4
Pick a number> 2
Note for Vikram Nair: Feeling much better, stiffness gone.
```
Enter to continue.

**5. Run the guarded agent** - real local model, takes ~30-60s on CPU
```
> 7
```
No sub-prompt - it processes whatever's due for this doctor. Streams
`Tool #1: get_patient_notes`, `Tool #2: send_notification` as the model
actually reasons, then prints the sent message. **Don't rush this one on
camera - let it finish, the wait itself shows it's a real model, not a
script.** If it errors instead (Ollama not running / model not pulled), it
prints exactly why and the follow-up stays pending - fix it and press `7`
again, nothing is lost.

**Say while it's running:**
> "This is the Strands Agent, backed by a real local model. Every tool call
> it makes is checked against a Cedar policy before it runs - it's allowed
> to read this patient's notes and send one specific kind of message, and
> nothing else."

**6. Show Cedar actually deny something - not staged, a real check**
```
> 8
Patient ID: <paste a Dr. Khan patient_id from the startup listing>
```
Prints `[Cedar] view_patient -> DENIED (...)`. Then do it again with one of
your own patient IDs to show the same check allowing it:
```
> 8
Patient ID: <one of Dr. Mehta's own patient IDs>
```
Prints `ALLOWED` and the patient's info.

**Say:**
> "Same code path either way - Cedar decided, I didn't hardcode a doctor
> check into this one screen."

**7. Schedule a follow-up due right now, then fire it live**
```
> 6
Pick a number> 1
Check back on Asha Rao in how many days? (0 = today) 0
```
Enter to continue, then repeat step 5 (`> 7`) to show a reminder firing on
demand, not just from the pre-loaded data.

---

## Show the code (30s)

Open these three as tabs beforehand:

1. **`infra/template.yaml`** - DynamoDB tables, Lambda functions, the Step
   Functions state machine (line 132) - a real SAM template.
2. **`src/adios/auth/policies.cedar`** - the whole 42-line access-control
   policy, in one file.
3. **`src/adios/agent/followup_agent.py` (`build_agent`)** - `CedarAuthorization`
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
- Every layer having a local fallback meant nothing broke while building,
  even with no infra running.

## If something breaks mid-recording

- `ModuleNotFoundError`: `pip install -r requirements.txt`.
- OpenSearch/DynamoDB warnings in the log: expected, harmless, it's using
  the local fallback - not a failure.
- Option 7 errors "Can't run the agent right now": `ollama serve` isn't
  running, or the model isn't pulled (`ollama pull gemma4:e2b`). Fix it,
  press `7` again - the follow-up is still pending, nothing to redo.
- Option 7 seems to hang: it's not hanging, it's thinking - 30-60s is
  normal on CPU. It will error out on its own if something's actually wrong.
