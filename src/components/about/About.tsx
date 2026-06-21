import * as React from 'react';

import ContentHeader from '~/components/ContentHeader';
import { GitHub } from '~/components/shared/FeatherIcons';
import { useAboutVersionQuery } from '~/modules/about/hooks';
import { getCoreVersionMeta } from '~/modules/about/utils';
import { ClashAPIConfig } from '~/types';

import s from './About.module.scss';

type Props = { apiConfig: ClashAPIConfig };

function Version({ name, link, version }: { name: string; link: string; version: string }) {
  return (
    <div className={s.root}>
      <h2>{name}</h2>
      <p>
        <span>Version </span>
        <span className={s.mono}>{version}</span>
      </p>
      <p>
        <a className={s.link} href={link} target="_blank" rel="noopener noreferrer">
          <GitHub size={20} />
          <span>Source</span>
        </a>
      </p>
    </div>
  );
}

export function About({ apiConfig }: Props) {
  const { data: version } = useAboutVersionQuery(apiConfig);
  const coreVersionMeta = getCoreVersionMeta(version);

  return (
    <>
      <ContentHeader>About</ContentHeader>
      {coreVersionMeta && version?.version ? (
        <Version
          name={coreVersionMeta.name}
          version={version.version}
          link={coreVersionMeta.link}
        />
      ) : null}
      <Version name="Yacd" version={__VERSION__} link="https://github.com/metacubex/yacd" />
    </>
  );
}
