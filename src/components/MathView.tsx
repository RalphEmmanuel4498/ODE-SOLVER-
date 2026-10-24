import React, { useMemo } from "react";
import katex from "katex";

interface MathViewProps {
  math?: string;
  latex?: string;
  block?: boolean;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  latex,
  block = false,
  displayMode,
  className = ""
}) => {
  const formula = latex !== undefined ? latex : (math || "");
  const isBlock = displayMode !== undefined ? displayMode : block;
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode: isBlock,
        throwOnError: false,
      });
    } catch (e) {
      return formula;
    }
  }, [formula, isBlock]);

  return (
    <span
      className={`inline-block font-serif ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
