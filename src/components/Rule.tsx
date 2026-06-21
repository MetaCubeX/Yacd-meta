import React from 'react';

import { FileText, Globe, Hash, Link, Shield, Zap } from '~/components/shared/FeatherIcons';

import s0 from './Rule.module.scss';

const colorMap = {
  _default: 'var(--color-focus-blue)',
  DIRECT: '#f5bc41',
  REJECT: '#cb3166',
};

function getStyleFor({ proxy }) {
  let color = colorMap._default;
  if (colorMap[proxy]) {
    color = colorMap[proxy];
  }
  return { color };
}

function getIconFor(type: string) {
  switch (type) {
    case 'Domain':
    case 'DomainSuffix':
    case 'DomainKeyword':
      return <Link size={14} />;
    case 'IPCIDR':
    case 'IPCIDR6':
      return <Hash size={14} />;
    case 'GeoSite':
    case 'GeoIP':
      return <Globe size={14} />;
    case 'REJECT':
      return <Shield size={14} />;
    case 'DIRECT':
      return <Zap size={14} />;
    default:
      return <FileText size={14} />;
  }
}

type Props = {
  id?: number;
  type?: string;
  payload?: string;
  proxy?: string;
  size?: number;
};

function Rule({ type, payload, proxy, id, size }: Props) {
  const styleProxy = getStyleFor({ proxy });
  return (
    <div className={s0.rule}>
      <div className={s0.left}>{id}</div>
      <div className={s0.right}>
        <div className={s0.payloadRow}>
          <div className={s0.payload}>{payload}</div>
          {(type === 'GeoSite' || type === 'GeoIP') && <div className={s0.size}>size: {size}</div>}
        </div>
        <div className={s0.metaRow}>
          <div className={s0.typeTag}>
            {getIconFor(type)}
            <span>{type}</span>
          </div>
          <div className={s0.proxyTag} style={styleProxy}>
            {proxy}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rule;
