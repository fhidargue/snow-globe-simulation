import { Perf } from "r3f-perf";
import "./FPSCounter.scss";

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
