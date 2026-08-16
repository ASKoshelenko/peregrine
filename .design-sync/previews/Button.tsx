import { Button } from "@peregrine/ui";

export const Primary = () => <Button variant="primary">Replay real release</Button>;
export const Secondary = () => <Button variant="secondary">Reset to observed release</Button>;
export const Disabled = () => <Button variant="primary" disabled>Run live inference</Button>;
export const Pair = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <Button variant="primary">Walk the platform</Button>
    <Button variant="secondary">Run the product</Button>
  </div>
);
