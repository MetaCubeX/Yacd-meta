import cx from 'clsx';
import { useTranslation } from 'react-i18next';

import { PageHeaderSkeleton } from '~/components/shared/PageHeader';
import { Skeleton, SkeletonText } from '~/components/shared/Skeleton';
import { splitItemsByLayout } from '~/modules/proxies/utils';

import s0 from './Proxies.module.scss';
import sh from './ProxiesHeader.module.scss';
import s from './ProxiesSkeleton.module.scss';
import { ProxyCard } from './ProxyCard';

// 名称宽度各不相同，接近真实代理组名的长短分布
const NAME_WIDTHS = ['34%', '22%', '41%', '27%', '30%', '19%'];

export function ProxiesSkeleton({ proxiesLayout }: { proxiesLayout: string }) {
  const { t } = useTranslation();
  const columns = splitItemsByLayout(NAME_WIDTHS, proxiesLayout);

  return (
    <div className={s0.page} aria-busy>
      <PageHeaderSkeleton
        title={t('Proxies')}
        actionCount={3}
        searchClassName={sh.search}
        actionsClassName={sh.actions}
      />
      <div className={cx(s0.groupsContainer, { [s0.doubleColumn]: proxiesLayout === 'double' })}>
        {columns.map((column, i) => (
          <div key={i} className={s0.column}>
            {column.map((nameWidth, j) => (
              <ProxyCard key={j}>
                <div className={s.head}>
                  <SkeletonText width={nameWidth} className={s.name} />
                  <Skeleton width={46} height={20} />
                  <SkeletonText width={40} className={s.latency} />
                </div>
                <div className={s.status}>
                  <SkeletonText width="28%" />
                  <Skeleton height={8} radius={4} className={s.dots} />
                </div>
              </ProxyCard>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
