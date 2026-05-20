import { formatNumber } from "../../utils/format";

interface Props {
    noPrayer10: number;
    noPrayer60: number;
    withPrayer10: number;
    withPrayer60: number;
}

export default function RateResultGrid({ noPrayer10, noPrayer60, withPrayer10, withPrayer60 }: Props) {
    return (
        <div className="rate-result-grid">
            <div className="rate-grid-cell rate-grid-header" />
            <div className="rate-grid-cell rate-grid-header">無祈禱</div>
            <div className="rate-grid-cell rate-grid-header prayer-col">有祈禱</div>

            <div className="rate-grid-cell rate-grid-label">10 分鐘</div>
            <div className="rate-grid-cell rate-grid-value">{formatNumber(noPrayer10)}</div>
            <div className="rate-grid-cell rate-grid-value prayer-col">{formatNumber(withPrayer10)}</div>

            <div className="rate-grid-cell rate-grid-label">60 分鐘</div>
            <div className="rate-grid-cell rate-grid-value">{formatNumber(noPrayer60)}</div>
            <div className="rate-grid-cell rate-grid-value prayer-col">{formatNumber(withPrayer60)}</div>
        </div>
    );
}
