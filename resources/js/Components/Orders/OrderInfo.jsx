import SectionCard from '@/Components/SectionCard';

export default function OrderInfo({ title, index, items = [] }) {
    return (
        <SectionCard title={title} index={index} className="ui-order-info-card">
            {items.map((item, i) => (
                <div className="ui-order-info-row" key={i}>
                    <span className="ui-order-info-label">{item.label}</span>
                    <span className="ui-order-info-value">{item.value}</span>
                </div>
            ))}
        </SectionCard>
    );
}