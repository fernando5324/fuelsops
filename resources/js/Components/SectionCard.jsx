import React from 'react';
import { Card } from 'antd';

export default function SectionCard({ title, description, index, children, ...rest }) {
    return (
        <Card
            className="ui-card-gap ui-section-card"
            title={
                <div className="ui-section-head">
                    <span className="ui-section-title">
                        {index != null && <span className="ui-section-index">{index}</span>}
                        {title}
                    </span>
                    {description && <span className="ui-section-desc">{description}</span>}
                </div>
            }
            {...rest}
        >
            {children}
        </Card>
    );
}