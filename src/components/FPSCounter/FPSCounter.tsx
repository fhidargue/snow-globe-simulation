import "./FPSCounter.scss";

import { Perf } from "r3f-perf";

export default function FPSCounter() {
  return (
    <Perf
      position="top-left"
      minimal
      showGraph={false}
      className="fps-counter"
    />
  );
}
