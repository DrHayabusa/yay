/** UAE vehicle plate rendered as the physical object — instant recognition. */
export function Plate({
  emirate,
  code,
  number,
}: {
  emirate: string;
  code?: string | null;
  number: string;
}) {
  return (
    <span className="plate" title={`${emirate} ${code ?? ''} ${number}`}>
      <span className="plate__emirate">{emirate.slice(0, 3)}</span>
      {code ? <span className="plate__code">{code}</span> : null}
      <span className="plate__num">{number}</span>
    </span>
  );
}
