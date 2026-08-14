# ADR-0004: budgets are committed before the run they judge

The observed-run builder records the commit that last touched `configs/targets/matrix.yaml`
and the commit the run was built from, and refuses to emit a run unless the budget commit
strictly precedes the run commit. A threshold chosen after seeing the number is not a gate;
`git log` proves the order publicly.
