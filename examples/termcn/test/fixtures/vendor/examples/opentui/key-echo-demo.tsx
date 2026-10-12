// Test fixture standing in for a termcn demo: it reads keys with raw
// useKeyboard, as termcn components do, and prints every key it receives.
import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import type { ReactNode } from "react";

const KeyEchoDemo = function KeyEchoDemo(): ReactNode {
  const [keys, setKeys] = useState<string[]>([]);

  useKeyboard((key) => {
    setKeys((previous) => [...previous, key.name]);
  });

  return <text content={`demo keys: ${keys.length === 0 ? "none" : keys.join(",")}`} />;
};

export default KeyEchoDemo;
