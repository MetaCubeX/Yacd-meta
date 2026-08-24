import { produce } from 'immer';
import React from 'react';

import type { DispatchFn, State } from './types';

const { createContext, memo, useMemo, useRef, useEffect, useCallback, useContext, useState } =
  React;

/**
 * 绑定后的 action 树，形状由 store/index.ts 的 actions 决定，深度不定。
 * 这套自研 store 正在被 jotai + TanStack Query 取代（见 TODO.md），不为它补精确类型。
 */
type BoundActions = Record<string, any>;

// AppProviders 保证 Provider 一定在树上，这三个默认值取不到，
// 用 null! 断言掉，免得每个消费点都要判一次空
const StateContext = createContext<State>(null!);
const DispatchContext = createContext<DispatchFn>(null!);
const ActionsContext = createContext<BoundActions>(null!);

export function useStoreState() {
  return useContext(StateContext);
}

export function useStoreDispatch() {
  return useContext(DispatchContext);
}

export function useStoreActions() {
  return useContext(ActionsContext);
}

type ProviderProps = {
  initialState: State;
  actions?: Record<string, unknown>;
  children: React.ReactNode;
};

// boundActionCreators
export default function Provider({ initialState, actions = {}, children }: ProviderProps) {
  const stateRef = useRef(initialState);
  const [state, setState] = useState(initialState);
  const getState = useCallback(() => stateRef.current, []);
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).getState2 = getState;
    }
  }, [getState]);
  const dispatch = useCallback(
    (actionId: string | ((a: any, b: any) => any), fn?: (s: any) => void) => {
      if (typeof actionId === 'function') return actionId(dispatch, getState);
      if (!fn) return;

      const stateNext = produce(getState(), fn);
      if (stateNext !== stateRef.current) {
        if (import.meta.env.DEV) {
          console.log(actionId, stateNext);
        }
        stateRef.current = stateNext;
        setState(stateNext);
      }
    },
    [getState],
  );
  const boundActions = useMemo(() => bindActions(actions, dispatch), [actions, dispatch]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <ActionsContext.Provider value={boundActions}>{children}</ActionsContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function connect(mapStateToProps: any) {
  return (Component: any) => {
    const MemoComponent = memo(Component);
    function Connected(props: any) {
      const state = useContext(StateContext);
      const dispatch = useContext(DispatchContext);
      const mapped = mapStateToProps(state, props);
      const nextProps = { dispatch, ...props, ...mapped };
      return <MemoComponent {...nextProps} />;
    }
    return Connected;
  };
}

// steal from https://github.com/reduxjs/redux/blob/master/src/bindActionCreators.ts
function bindAction(action: any, dispatch: any) {
  return function (...args: any[]) {
    return dispatch(action(...args));
  };
}

function bindActions(actions: any, dispatch: any) {
  const boundActions: Record<string, unknown> = {};
  for (const key in actions) {
    const action = actions[key];
    if (typeof action === 'function') {
      boundActions[key] = bindAction(action, dispatch);
    } else if (typeof action === 'object') {
      boundActions[key] = bindActions(action, dispatch);
    }
  }
  return boundActions;
}
