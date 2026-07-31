import type { GuideData } from '../core/guide';

/**
 * Print-only rendering of the build guide (the app shell is `print:hidden`).
 * Unlike the on-screen <pre>, this wraps: each course is a hanging-indent
 * paragraph with color swatches, compact enough for Letter/A4.
 */
export function PrintGuide({ data }: { data: GuideData }) {
  return (
    <div className="print-guide hidden print:block">
      <h1>LEGO DESIGNER — build guide</h1>
      <p className="meta">{data.gridLine}</p>
      <p className="meta">{data.pieceSetLine}</p>
      <p className="meta">{data.partsLine}</p>
      <p className="instructions">{data.buildLines.join(' ')}</p>
      <ol className="courses">
        {data.courses.map(({ course, pieces }) => (
          <li key={course}>
            <span className="course-label">
              Course {String(course).padStart(3, '0')}:
            </span>{' '}
            {pieces.map((p, i) => (
              <span key={i} className="piece">
                <span className="swatch" style={{ backgroundColor: p.hex }} />
                {p.text}
                {i < pieces.length - 1 ? ',' : ''}
              </span>
            ))}
          </li>
        ))}
      </ol>
      <p className="frame">{data.frameLine}</p>
    </div>
  );
}
