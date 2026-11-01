import { testRegex } from './devToolsLogic';

// 되돌아가기가 폭발하는 패턴도 화면이 멈추지 않도록 워커에서 실행하고, 시간이 넘으면 화면 쪽에서 종료한다
self.onmessage = ({ data }) => {
  self.postMessage({ id: data.id, result: testRegex(data.pattern, data.flags, data.text) });
};
