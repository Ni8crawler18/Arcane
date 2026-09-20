from adios.auth.authorize import authorize


def test_owning_doctor_is_allowed():
    decision = authorize("dr_mehta", "view_notes", "pat_1", owning_doctor_id="dr_mehta")
    assert decision.allowed


def test_non_owning_doctor_is_denied():
    decision = authorize("dr_khan", "view_notes", "pat_1", owning_doctor_id="dr_mehta")
    assert not decision.allowed
    assert "dr_khan" in decision.reason


def test_all_patient_actions_require_ownership():
    for action in ["view_patient", "add_note", "view_notes", "search_notes", "schedule_followup"]:
        assert authorize("dr_mehta", action, "pat_1", owning_doctor_id="dr_mehta").allowed
        assert not authorize("dr_other", action, "pat_1", owning_doctor_id="dr_mehta").allowed
