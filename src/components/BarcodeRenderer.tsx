import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export default function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 45,
  displayValue = true,
  fontSize = 13,
  className = '',
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 6,
          background: 'transparent',
          lineColor: '#0f172a',
          font: 'JetBrains Mono',
        });
      } catch (err) {
        console.warn('Barcode render error, falling back to standard CODE128:', err);
        try {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
          });
        } catch {}
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={`max-w-full inline-block ${className}`} />;
}
