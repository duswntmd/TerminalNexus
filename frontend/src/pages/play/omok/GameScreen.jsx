import React from 'react';
import { useTranslation } from 'react-i18next';
import OmokBoard from './OmokBoard.jsx';
import { OptionButtons, PlayerCard, MoveList, ReviewBar, Toast } from './parts.jsx';

/**
 * 대국 화면 틀 (AI·2인·온라인 공용)
 * 데스크톱: 왼쪽에 판, 오른쪽에 대국자·상태·버튼·기보가 스크롤 없이 한 화면
 * 모바일: 대국자 두 명 → 판(화면 폭 가득) → 상태·버튼, 기보는 그 아래
 */
const GameScreen = ({
  topbar, opts, toggle, top, bottom, board, status, notice, actions, overlay, moves, review, extra, toast,
}) => {
  const { t } = useTranslation();
  return (
    <div className="om-stage">
      <div className="om-topbar">
        {topbar}
        <div className="om-topbar-right"><OptionButtons opts={opts} toggle={toggle} /></div>
      </div>
      <div className={`om-main${extra ? ' has-extra' : ''}`}>
        <div className="om-a-top"><PlayerCard {...top} /></div>
        <div className="om-a-bottom"><PlayerCard {...bottom} /></div>
        <div className="om-a-board">
          <div className="om-board-fit">
            <OmokBoard
              {...board}
              showNumbers={opts.numbers}
              label={t('omok.board_label')}
              forbiddenLabel={(reason) => t(`omok.forbidden_short.${reason}`)}
            />
            {overlay}
          </div>
        </div>
        <div className="om-a-status">
          {status}
          {notice}
        </div>
        <div className="om-a-actions">{actions}</div>
        <div className="om-a-moves">
          {review && <ReviewBar {...review} />}
          <MoveList {...moves} />
        </div>
        {extra && <div className="om-a-extra">{extra}</div>}
      </div>
      <Toast toast={toast} />
    </div>
  );
};

export default GameScreen;
