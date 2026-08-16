import { GlossTerm, OpsCard } from "@peregrine/ui";

/** Canonical posture card: kicker, claim, body, and the source path that proves it. */
export const Identity = () => (
  <OpsCard
    kicker="IDENTITY"
    title="One scoped role, nothing ambient"
    source="infra/gcp/terraform/serving.tf#L35-L48 · Dockerfile#L14-L23"
  >
    The runtime service account holds a single project role, roles/aiplatform.user, used only for the
    cloud scope call a visitor asks for. The released model is bundled and fingerprint-checked at startup.
  </OpsCard>
);

/** Title carrying a glossary trigger, as the supply-chain card really does. */
export const SupplyChain = () => (
  <OpsCard
    kicker="SUPPLY CHAIN"
    title={<><GlossTerm>Digest</GlossTerm>, not a mutable tag</>}
    source="infra/gcp/terraform/serving.tf#L13-L33 · infra/gcp/terraform/variables.tf#L23-L26"
  >
    Terraform pins the exact container digest. Artifact Registry deletes untagged images after seven days.
  </OpsCard>
);

/** The shortest body in the set — the card must not collapse around it. */
export const Cost = () => (
  <OpsCard
    kicker="COST"
    title={<><GlossTerm>Scale 0 → 1</GlossTerm>, never beyond</>}
    source="infra/gcp/terraform/serving.tf#L62-L95"
  >
    One CPU, 1 GiB, concurrency four, request-only CPU and no always-on instance.
  </OpsCard>
);

/** Source omitted — the claim stands without a disclosure row. */
export const NoSource = () => (
  <OpsCard kicker="FAILURE" title={<><GlossTerm>Fail closed</GlossTerm> at every seam</>}>
    Model hash mismatch blocks readiness; missing evidence renders a dash; failed gates block promotion.
  </OpsCard>
);
