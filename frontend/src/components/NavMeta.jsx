import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/** 자체 메타 태그가 없는 페이지에 메뉴 이름과 설명으로 제목을 붙인다 */
const NavMeta = ({ id, path }) => {
  const { t } = useTranslation();
  return (
    <Helmet>
      <title>{`${t(`nav.${id}.name`)} | TerminalNexus`}</title>
      <meta name="description" content={t(`nav.${id}.desc`)} />
      <link rel="canonical" href={`https://tnhub.kr${path}`} />
    </Helmet>
  );
};

export default NavMeta;
