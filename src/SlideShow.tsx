import { useControls } from 'leva';
import { Component, createContext, CSSProperties, FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useDynamic } from './useDynamic';


export type ErrorBoundaryProps = {style?: CSSProperties, children: ReactNode};

export class ErrorBoundary extends Component<ErrorBoundaryProps, {error?: Error}> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {error: undefined};
  }

  static getDerivedStateFromError(error: Error) { 
    return { error };
  }

  // no `componentDidCatch(...)` as the error is logged to the console anyway

  render() {
    if (this.state.error !== undefined) {
      return (
        <div style={{margin: 50, fontSize: 40}}>
          <h2>Rendering Error</h2>
          {`${this.state.error}`}
          <br/>
          <br/>
          <button onClick={() => this.setState({error: undefined})}>
            Try again.
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

export const Slide: FC<{
  className?: string; style?: CSSProperties; children: ReactNode;
}> = ({
  className, style = {}, children
}) => (
  <div className={className} style={{
    boxSizing: "border-box",
    height: "100vh", width: "100vw",
    overflow: "clip",
    display: "flex", flexDirection: "column",
    ...style,
  }}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </div>
);

const StepCtx = createContext<{
  step: number | undefined,
  setStep: (step: number | undefined) => void,
}>({} as any);

export function useStep(n: number) {
  const {setStep} = useContext(StepCtx);

  useEffect(() => {
    setStep(n);
    return () => setStep(undefined);
  }, [n]);
};

function setFullScreen(value: boolean) {
  const fullscreenActive = Boolean(document.fullscreenElement);
  if (value !== fullscreenActive) {
    if (fullscreenActive) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  }
}

export const SlideShow: FC<{children: JSX.Element[]}> = ({children}) => {
  const [{ slide }, setControls] = useControls(() => ({
    "full screen": {value: false, onChange: setFullScreen},
    slide: { label: "slide#", value: 1, min: 1, max: children.length, step: 1 },
  }));

  useEffect(() => {
    function updateFullscreenControl() {
      setControls({"full screen": !!document.fullscreenElement});
    }
    document.addEventListener("fullscreenchange", updateFullscreenControl);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenControl);
  }, []);

  const ref = useDynamic(slide);
  useEffect(() => {
    const nSlides = children.length;

    const clampSlideNo = (n: number) => Math.max(1, Math.min(nSlides, n));

    function onKeyUp(evt: KeyboardEvent) {
      let n;
      switch (evt.key) {
        case "ArrowRight":
          n = evt.ctrlKey ? children.length : ref.current + 1;
          break;
        case "ArrowLeft":
          n = evt.ctrlKey ? 1               : ref.current - 1;
          break;
        default: return;
      }
      window.location.hash = String(clampSlideNo(n));
    };

    function onHashChange() {
      let n = Number.parseInt(window.location.hash.substring(1));
      if (Number.isNaN(n)) {
        n = 1;
      };
      setControls({slide: clampSlideNo(n)});
    }

    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("hashchange", onHashChange);
    onHashChange();

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("hashchange", onHashChange);
    }
  }, []);

  const [step, setStep] = useState<number | undefined>();
  return (
    <StepCtx.Provider value={{step, setStep}}>
      <div style={{fontSize: 50, color: "white", background: "#002"}}>
        {children[slide - 1]}
      </div>
      <div
        style={{
          position: "absolute", right: 20, bottom: 20,
          fontSize: 20, color: "white",
        }}
      >
        {"" + slide + (step === undefined ? "" : `-${step}`)}
      </div>
    </StepCtx.Provider>
  );
};

export const DynamicItems: FC<{folder: string, children: ReactNode | ReactNode[]}> = ({
  folder, children: childrenArg,
}) => {
  const children = childrenArg instanceof Array ? childrenArg : [childrenArg];

  const controlFn = () => ({
    nItems: {label: "#items", value: 0, min: 0, max: children.length, step: 1},
  })
  const [{nItems}, set] =
    folder ? useControls(folder, controlFn) : useControls(controlFn);
  const ref = useDynamic(nItems);

  useStep(nItems);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown": return set({nItems: event.ctrlKey ? children.length : ref.current + 1});
        case "ArrowUp"  : return set({nItems: event.ctrlKey ? 0               : ref.current - 1});
      }
    };
  
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, []);

  return (<>
    <style>{`
      .dynamic-parent > :nth-child(-n+${nItems+1}) {
        opacity: 1;
        transition: opacity 0.5s;
      }
      .dynamic-parent > :nth-child(n+${nItems+1}) {
        opacity: 0;
        transition: opacity 0.5s;
      }
    `}</style>
    <div className="dynamic-parent" style={{display: "contents"}}>
      {children}
    </div>
  </>);
};
