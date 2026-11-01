import React, { useEffect, useRef } from 'react';

const CLIENT = 'ca-pub-5219644194013770';

/** 애드센스 광고 단위. slot이 없으면(.env 미설정) 아무것도 그리지 않는다 */
const AdSlot = ({ slot }) => {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기가 있으면 실패해도 화면에는 영향이 없다
    }
  }, [slot]);

  if (!slot) return null;
  return (
    <div className="tn-ad" aria-hidden="true">
      <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={CLIENT} data-ad-slot={slot}
        data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
};

export default AdSlot;
