import { useEffect, useState } from 'react';
import { Button } from './components/ui';
import { DemoProvider } from './demo/DemoProvider';
import { useDemo } from './demo/context';
import { ACTIONS } from './demo/reducer';
import {
  completeOnboarding,
  hasEnteredDemo,
  hasFinishedOnboarding,
  launchDemo,
  loadPreferences,
  replayOnboarding,
  resetDemoPersistence,
  savePreference,
} from './demo/persistence';
import LandingPage from './features/landing/LandingPage';
import OnboardingDialog from './features/onboarding/OnboardingDialog';

function Experience() {
  const { state, dispatch } = useDemo();
  const [entered, setEntered] = useState(() => hasEnteredDemo());
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  function enterDemo() {
    launchDemo();
    setEntered(true);
    setOnboardingOpen(!hasFinishedOnboarding());
  }

  function choosePersona(personaId) {
    savePreference('persona', personaId);
    dispatch({ type: ACTIONS.SET_PERSONA, personaId });
  }

  function finishOnboarding() {
    completeOnboarding();
    setOnboardingOpen(false);
  }

  function replay() {
    replayOnboarding();
    setOnboardingOpen(true);
  }

  function reset() {
    resetDemoPersistence();
    dispatch({ type: ACTIONS.RESET_DEMO });
    setEntered(false);
    setOnboardingOpen(false);
  }

  if (!entered) return <LandingPage onLaunch={enterDemo} />;

  return (
    <>
      <main className="cockpit-placeholder">
        <p>Portfolio demo · mock data</p>
        <h1>AetherSDK cockpit</h1>
        <p>Signed in as {state.activePersonaId}. The operational shell is the next implementation slice.</p>
        <div><Button onClick={replay}>Replay onboarding</Button> <Button variant="ghost" onClick={reset}>Sign out / reset demo</Button></div>
      </main>
      <OnboardingDialog
        open={onboardingOpen}
        onComplete={finishOnboarding}
        onSkip={finishOnboarding}
        onPersonaChange={choosePersona}
      />
    </>
  );
}

export default function App() {
  const preferences = loadPreferences();
  const initialState = undefined;
  return (
    <DemoProvider initialState={initialState}>
      <PreferenceBridge preferences={preferences} />
      <Experience />
    </DemoProvider>
  );
}

function PreferenceBridge({ preferences }) {
  const { state, dispatch } = useDemo();
  useEffect(() => {
    if (state.activePersonaId !== preferences.persona) dispatch({ type: ACTIONS.SET_PERSONA, personaId: preferences.persona });
    if (state.theme !== preferences.theme) dispatch({ type: ACTIONS.SET_THEME, theme: preferences.theme });
    if (state.density !== preferences.density) dispatch({ type: ACTIONS.SET_DENSITY, density: preferences.density });
  }, [dispatch, preferences, state.activePersonaId, state.density, state.theme]);
  return null;
}
