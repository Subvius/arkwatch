import * as React from 'react';
import { motion, useAnimation } from 'framer-motion';

export type IdleMode = 'none' | 'salad' | 'sleep' | 'workout';

export type ElephantMascotProps = {
  headwear: 'none' | 'helmet' | 'nightcap' | 'medic';
  surfing: boolean;
  idleMode: IdleMode;
  scheduledIdle: boolean;
  appFocused: boolean;
};

export type ElephantMascotHandle = {
  triggerGreeting: () => void;
};

// --- PIXEL ART GRIDS ---
// 0 = Transparent, 1 = Main Body (#36558F), 2 = Ears (#8CA8D9)
// 3 = Spark/Accent (#E68A5C), 4 = Glasses Frame (#1A2A4A), 5 = Glass (#A0E8FA)
// 6 = Dark Eyes (#333333), 7 = Helmet Yellow (#F4D03F), 8 = Helmet Accent (#E67E22)
// 9 = Surfboard Ocean Blue (#0088FF), A = Surfboard White Stripe (#FFFFFF)
// B = Nightcap Red (#E74C3C), C = Nightcap Dark Red (#922B21), D = Pom-Pom White (#ECF0F1)
// E = Bowl Silver (#BDC3C7), F = Salad Green (#2ECC71)
// G = Tomato Red (#E74C3C), H = Corn Yellow (#F4D03F), I = Carrot Orange (#E67E22)
// J = Moon Yellow (#F1C40F)
// K = Medic White (#E2E8F0), L = Medic Red (#E74C3C), M = Steth Silver (#BDC3C7), N = Steth Dark (#2C3E50)

const bodyNormal1 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221661116612222',
  '22221661116612222',
  '22221111111112222',
  '22201111111110222',
  '02001111111110020',
  '00001100000110000',
  '00001100000110000',
];

const bodyNormal2 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221661116612222',
  '22221661116612222',
  '22221111111112222',
  '02201111111110220',
  '22201111111110222',
  '02001100000110020',
  '00001100000110000',
];

const bodyHappy1 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221161116112222',
  '22221616161612222',
  '22221111111112222',
  '22201111111110222',
  '02001111111110020',
  '00001100000110000',
  '00001100000110000',
];

const bodyHappy2 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221161116112222',
  '22221616161612222',
  '22221111111112222',
  '02201111111110220',
  '22201111111110222',
  '02001100000110020',
  '00001100000110000',
];

const bodySleepClosed1 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221111111112222',
  '22221661116612222',
  '22221111111112222',
  '22201111111110222',
  '02001111111110020',
  '00001100000110000',
  '00001100000110000',
];

const bodySleepClosed2 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221111111112222',
  '22221661116612222',
  '22221111111112222',
  '02201111111110220',
  '22201111111110222',
  '02001100000110020',
  '00001100000110000',
];

const bodySleepLeftOpen1 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221661111112222',
  '22221661116612222',
  '22221111111112222',
  '22201111111110222',
  '02001111111110020',
  '00001100000110000',
  '00001100000110000',
];

const bodySleepLeftOpen2 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221661111112222',
  '22221661116612222',
  '22221111111112222',
  '02201111111110220',
  '22201111111110222',
  '02001100000110020',
  '00001100000110000',
];

const bodySleepRightOpen1 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221111116612222',
  '22221661116612222',
  '22221111111112222',
  '22201111111110222',
  '02001111111110020',
  '00001100000110000',
  '00001100000110000',
];

const bodySleepRightOpen2 = [
  '00000111111100000',
  '00021111111112000',
  '02221111111112220',
  '22221111111112222',
  '22221111116612222',
  '22221661116612222',
  '22221111111112222',
  '02201111111110220',
  '22201111111110222',
  '02001100000110020',
  '00001100000110000',
];

const trunkGridLeft = [
  '01110', '01110', '01110', '01110', '01110', '11100',
];

const trunkGridRight = [
  '01110', '01110', '01110', '01110', '01110', '00111',
];

const glassesGrid = [
  '044444440',
  '455444554',
  '455444554',
  '044000440',
];

const helmetGrid = [
  '00000007770000000',
  '00000077777000000',
  '00000777777700000',
  '00000778887700000',
  '00007777777770000',
];

const nightcapGrid = [
  '00000000000DD0000',
  '000000000BBCD0000',
  '0000000BCBC000000',
  '000000BCBCBC00000',
  '00000CCCCCCC00000',
];

const medicHatGrid = [
  '000000KKKKK000000',
  '00000KKKKKKK00000',
  '00000KKKLKKK00000',
  '00000KKLLLKK00000',
  '00000KKKLKKK00000',
  '0000KKKKKKKKK0000',
];

const stethGrid = [
  '0N0000000000000N0',
  '00M00000000000M00',
  '000M000000000M000',
  '0000M0000000M0000',
  '00000MMMMMMM00000',
  '00000000M00000000',
  '0000000NNN0000000',
  '0000000NNN0000000',
];

const surfboardGrid = [
  '09999999999999999990',
  '009A999A999A999A9900',
];

const bowlGrid = [
  '0000FGH0000',
  '000IFGFI000',
  '00EEEEEEE00',
  '0EEEEEEEEE0',
];

const headbandGrid = [
  '00000000000000000',
  '00000000000000000',
  '0000LKKKLKKKL0000',
];

const barbellGrid = [
  '0N0000000000000N0',
  'NNMMMMMMMMMMMMMNN',
  '0N0000000000000N0',
];

// Contextual Spark/Icon Grids
const sparkFrame1 = ['030', '333', '030'];
const sparkFrame2 = ['303', '030', '303'];
const moonFrame = ['0JJ', 'J00', '0JJ'];

const leafFrame1 = ['0F0', 'FF0', '0F0'];
const leafFrame2 = ['00F', '0FF', '0F0'];

const heartFrame1 = ['L0L', 'LLL', '0L0'];
const heartFrame2 = ['000', 'L0L', '0L0'];

const surfSpark1 = ['090', '999', '090'];
const surfSpark2 = ['000', '090', '000'];

const gearFrame1 = ['E0E', '0EE', 'E0E'];
const gearFrame2 = ['0E0', 'EEE', '0E0'];

const bulbFrame1 = ['0H0', 'HHH', '0E0'];
const bulbFrame2 = ['H0H', '0H0', '0E0'];

const starFrame1 = ['0H0', 'HHH', '0H0'];
const starFrame2 = ['H0H', '0H0', 'H0H'];

const PIXEL_SIZE = 7;
const BASE_X = 20;
const BASE_Y = 15;

const FOOD_COLORS = ['#2ECC71', '#E74C3C', '#F4D03F', '#E67E22'];

const gridCache = new Map<string[], React.ReactNode[]>();

function renderGrid(gridData: string[]): React.ReactNode[] {
  const cached = gridCache.get(gridData);
  if (cached) return cached;

  const rects: React.ReactNode[] = [];

  gridData.forEach((row, y) => {
    let startX = -1;
    let currentFill = '';

    for (let x = 0; x <= row.length; x++) {
      const cell = row[x];
      let fill = '';
      if (cell === '1') fill = '#36558F';
      else if (cell === '2') fill = '#8CA8D9';
      else if (cell === '3') fill = '#E68A5C';
      else if (cell === '4') fill = '#1A2A4A';
      else if (cell === '5') fill = '#A0E8FA';
      else if (cell === '6') fill = '#333333';
      else if (cell === '7') fill = '#F4D03F';
      else if (cell === '8') fill = '#E67E22';
      else if (cell === '9') fill = '#0088FF';
      else if (cell === 'A') fill = '#FFFFFF';
      else if (cell === 'B') fill = '#E74C3C';
      else if (cell === 'C') fill = '#922B21';
      else if (cell === 'D') fill = '#ECF0F1';
      else if (cell === 'E') fill = '#BDC3C7';
      else if (cell === 'F') fill = '#2ECC71';
      else if (cell === 'G') fill = '#E74C3C';
      else if (cell === 'H') fill = '#F4D03F';
      else if (cell === 'I') fill = '#E67E22';
      else if (cell === 'J') fill = '#F1C40F';
      else if (cell === 'K') fill = '#E2E8F0';
      else if (cell === 'L') fill = '#E74C3C';
      else if (cell === 'M') fill = '#BDC3C7';
      else if (cell === 'N') fill = '#2C3E50';

      if (fill !== currentFill) {
        if (currentFill !== '') {
          rects.push(
            <rect
              key={`${startX}-${y}-${x}`}
              x={startX * PIXEL_SIZE}
              y={y * PIXEL_SIZE}
              width={(x - startX) * PIXEL_SIZE + 1.5}
              height={PIXEL_SIZE + 1.5}
              fill={currentFill}
            />
          );
        }
        startX = x;
        currentFill = fill;
      }
    }
  });

  gridCache.set(gridData, rects);
  return rects;
}

export const ElephantMascot = React.forwardRef<ElephantMascotHandle, ElephantMascotProps>(
  ({ headwear, surfing: surfingProp, idleMode, scheduledIdle, appFocused }, ref) => {
  const [frame, setFrame] = React.useState(0);
  const [isWearing, setIsWearing] = React.useState(false);
  const [isWearingHelmet, setIsWearingHelmet] = React.useState(false);
  const [isWearingNightcap, setIsWearingNightcap] = React.useState(false);
  const [isWearingMedic, setIsWearingMedic] = React.useState(false);
  const [isWearingHeadband, setIsWearingHeadband] = React.useState(false);
  const [isSurfing, setIsSurfing] = React.useState(false);
  const [isHappy, setIsHappy] = React.useState(false);
  const [sleepEyeState, setSleepEyeState] = React.useState<'closed' | 'left' | 'right'>('closed');
  const [activeFoodColor, setActiveFoodColor] = React.useState(FOOD_COLORS[0]);

  const isAnimating = React.useRef(false);
  const isSurfingRef = React.useRef(false);
  const isIdleRef = React.useRef(false);
  const currentIdleModeRef = React.useRef<IdleMode>('none');
  const appFocusedRef = React.useRef(appFocused);
  appFocusedRef.current = appFocused;

  const trunkControls = useAnimation();
  const glassesControls = useAnimation();
  const helmetControls = useAnimation();
  const nightcapControls = useAnimation();
  const headbandControls = useAnimation();
  const barbellControls = useAnimation();
  const medicHatControls = useAnimation();
  const stethControls = useAnimation();
  const bodyControls = useAnimation();
  const boardControls = useAnimation();
  const impactSplashControls = useAnimation();
  const sparkControls = useAnimation();
  const sparkSplashControls = useAnimation();
  const bowlControls = useAnimation();
  const foodControls = useAnimation();
  const floatControls = useAnimation();

  // Ear flapping + spark twinkle (paused when app unfocused)
  React.useEffect(() => {
    if (!appFocused) return;
    const interval = window.setInterval(() => {
      setFrame((prev) => (prev === 0 ? 1 : 0));
    }, 600);
    return () => window.clearInterval(interval);
  }, [appFocused]);

  // Float animation (paused when app unfocused)
  React.useEffect(() => {
    if (appFocused) {
      floatControls.start({ y: [0, -8, 0], transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } });
    } else {
      floatControls.stop();
      floatControls.set({ y: 0 });
    }
  }, [appFocused, floatControls]);

  const resumeSurfingIfNeeded = React.useCallback((): void => {
    if (isSurfingRef.current) {
      const wobble = { repeat: Infinity, repeatType: 'mirror' as const, duration: 1.5, ease: 'easeInOut' as const };
      bodyControls.start({ y: [-2, 2], rotate: [-4, 4], transition: wobble });
      trunkControls.start({ rotate: [0, -15], transition: wobble });
    }
  }, [bodyControls, trunkControls]);

  // Stop/resume surfing wobble on focus change
  React.useEffect(() => {
    if (!isSurfing) return;
    if (!appFocused) {
      bodyControls.stop();
      trunkControls.stop();
      boardControls.stop();
    } else {
      const wobble = { repeat: Infinity, repeatType: 'mirror' as const, duration: 1.5, ease: 'easeInOut' as const };
      bodyControls.start({ y: [-2, 2], rotate: [-4, 4], transition: wobble });
      trunkControls.start({ rotate: [0, -15], transition: wobble });
      boardControls.start({ y: [-2, 2], rotate: [-4, 4], transition: wobble });
    }
  }, [appFocused, isSurfing, bodyControls, trunkControls, boardControls]);

  // Stop sleep body/peek animations on unfocus, reset peek eye to closed
  React.useEffect(() => {
    if (!isIdleRef.current || currentIdleModeRef.current !== 'sleep') return;
    if (!appFocused) {
      bodyControls.stop();
      bodyControls.start({ rotate: 0, transition: { duration: 0.3 } });
      setSleepEyeState('closed');
    }
  }, [appFocused, bodyControls]);

  // --- IDLE HELPER FUNCTIONS ---

  const clearEquipmentsForIdle = React.useCallback(async (allowedEquipment?: string | null): Promise<void> => {
    const anims: Promise<unknown>[] = [];
    if (isWearing) {
      setIsWearing(false);
      anims.push(glassesControls.start({ y: 80, scale: 0, opacity: 0, transition: { duration: 0.4 } }));
    }
    if (isWearingHelmet) {
      setIsWearingHelmet(false);
      anims.push(helmetControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.4 } }));
    }
    if (isWearingNightcap && allowedEquipment !== 'nightcap') {
      setIsWearingNightcap(false);
      anims.push(nightcapControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.4 } }));
    }
    if (isWearingHeadband && allowedEquipment !== 'headband') {
      setIsWearingHeadband(false);
      anims.push(headbandControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.4 } }));
    }
    if (isWearingMedic) {
      setIsWearingMedic(false);
      anims.push(medicHatControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.4 } }));
      anims.push(stethControls.start({ y: 80, scale: 0, opacity: 0, rotate: 0, transition: { duration: 0.4 } }));
    }
    if (isSurfingRef.current) {
      setIsSurfing(false);
      isSurfingRef.current = false;
      boardControls.stop(); bodyControls.stop(); trunkControls.stop();
      anims.push(boardControls.start({ x: 150, opacity: 0, transition: { duration: 0.4 } }));
      anims.push(bodyControls.start({ y: 0, rotate: 0, transition: { duration: 0.4 } }));
      anims.push(trunkControls.start({ rotate: 0, transition: { duration: 0.4 } }));
    }

    if (anims.length > 0) {
      await Promise.all(anims);
      glassesControls.set({ opacity: 0 });
      helmetControls.set({ opacity: 0 });
      medicHatControls.set({ opacity: 0 });
      stethControls.set({ opacity: 0 });
      if (allowedEquipment !== 'nightcap') nightcapControls.set({ opacity: 0 });
      if (allowedEquipment !== 'headband') headbandControls.set({ opacity: 0 });
    }
  }, [isWearing, isWearingHelmet, isWearingNightcap, isWearingHeadband, isWearingMedic,
      glassesControls, helmetControls, nightcapControls, headbandControls, medicHatControls,
      stethControls, boardControls, bodyControls, trunkControls]);

  const waitInterruptible = React.useCallback(async (ms: number): Promise<boolean> => {
    const steps = ms / 100;
    for (let i = 0; i < steps; i++) {
      if (!isIdleRef.current) return false;
      // Suspend while app is unfocused — keep waiting without advancing
      while (!appFocusedRef.current && isIdleRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!isIdleRef.current) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
    return true;
  }, []);

  // --- IDLE LOOPS ---

  const runSaladIdleLoop = React.useCallback(async (): Promise<void> => {
    await bowlControls.start({ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 120 } });

    while (isIdleRef.current) {
      const variant = Math.floor(Math.random() * 4);
      setActiveFoodColor(FOOD_COLORS[variant]);
      if (!isIdleRef.current) break;

      if (variant === 0) {
        await trunkControls.start({ scaleY: 1.4, scaleX: 0.9, rotate: -15, transition: { duration: 0.6, ease: 'easeOut' } });
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 1, y: 0, x: 0 });
        void Promise.all([
          trunkControls.start({ scaleY: -0.6, scaleX: 1.1, rotate: 0, transition: { duration: 0.5, type: 'spring' } }),
          foodControls.start({ y: -25, x: PIXEL_SIZE, transition: { duration: 0.5, type: 'spring' } }),
        ]);
        await new Promise((r) => setTimeout(r, 600));
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 0 });
        setIsHappy(true);
        bodyControls.start({ y: [0, -3, 0, -3, 0], transition: { duration: 0.4 } });
        await new Promise((r) => setTimeout(r, 600));
        setIsHappy(false);
        if (!isIdleRef.current) break;
        await trunkControls.start({ scaleY: 1, scaleX: 1, transition: { duration: 0.5, ease: 'backOut' } });
      } else if (variant === 1) {
        await trunkControls.start({ scaleY: 1.4, scaleX: 0.8, rotate: -15, transition: { duration: 0.3, ease: 'easeIn' } });
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 1, y: 0, x: 0 });
        void Promise.all([
          trunkControls.start({ scaleY: -0.6, scaleX: 1.1, rotate: 0, transition: { duration: 0.3, type: 'spring', stiffness: 200 } }),
          foodControls.start({ y: -25, x: PIXEL_SIZE, transition: { duration: 0.3, type: 'spring', stiffness: 200 } }),
        ]);
        await new Promise((r) => setTimeout(r, 350));
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 0 });
        setIsHappy(true);
        bodyControls.start({ y: [0, -4, 0, -4, 0, -4, 0], transition: { duration: 0.3 } });
        await new Promise((r) => setTimeout(r, 400));
        setIsHappy(false);
        if (!isIdleRef.current) break;
        await trunkControls.start({ scaleY: 1, scaleX: 1, transition: { duration: 0.4, ease: 'backOut' } });
      } else if (variant === 2) {
        await trunkControls.start({ scaleY: 1.4, scaleX: 0.9, rotate: -15, transition: { duration: 0.5, ease: 'easeOut' } });
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 1, y: 0, x: 0 });
        trunkControls.start({ scaleY: -0.8, scaleX: 1.1, rotate: 0, transition: { duration: 0.4, type: 'spring', stiffness: 150 } });
        await foodControls.start({ y: -50, x: PIXEL_SIZE, transition: { duration: 0.4, ease: 'easeOut' } });
        if (!isIdleRef.current) break;
        foodControls.start({ y: -25, transition: { duration: 0.3, ease: 'easeIn' } });
        await trunkControls.start({ scaleY: -0.5, scaleX: 1.2, transition: { duration: 0.3 } });
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 0 });
        setIsHappy(true);
        bodyControls.start({ y: [0, -5, 0], transition: { duration: 0.5, type: 'spring' } });
        await new Promise((r) => setTimeout(r, 600));
        setIsHappy(false);
        if (!isIdleRef.current) break;
        await trunkControls.start({ scaleY: 1, scaleX: 1, transition: { duration: 0.5, ease: 'backOut' } });
      } else if (variant === 3) {
        await trunkControls.start({ scaleY: 1.4, scaleX: 0.95, rotate: -15, transition: { duration: 0.8, ease: 'easeInOut' } });
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 1, y: 0, x: 0 });
        void Promise.all([
          trunkControls.start({ scaleY: -0.6, scaleX: 1.1, rotate: 0, transition: { duration: 0.8, ease: 'easeInOut' } }),
          foodControls.start({ y: -25, x: PIXEL_SIZE, transition: { duration: 0.8, ease: 'easeInOut' } }),
        ]);
        await new Promise((r) => setTimeout(r, 900));
        if (!isIdleRef.current) break;
        foodControls.set({ opacity: 0 });
        setIsHappy(true);
        bodyControls.start({ y: [0, -2, 0, -2, 0], transition: { duration: 1.2, ease: 'easeInOut' } });
        await new Promise((r) => setTimeout(r, 1300));
        setIsHappy(false);
        if (!isIdleRef.current) break;
        await trunkControls.start({ scaleY: 1, scaleX: 1, transition: { duration: 0.6, ease: 'backOut' } });
      }
      await waitInterruptible(800);
    }
  }, [bowlControls, trunkControls, foodControls, bodyControls, waitInterruptible]);

  const runSleepIdleLoop = React.useCallback(async (): Promise<void> => {
    setSleepEyeState('closed');
    while (isIdleRef.current) {
      const finishedSleeping = await waitInterruptible(10000);
      if (!finishedSleeping) break;

      const openLeft = Math.random() > 0.5;
      setSleepEyeState(openLeft ? 'left' : 'right');
      bodyControls.start({ rotate: openLeft ? -3 : 3, transition: { duration: 0.4, ease: 'easeInOut' } });

      const finishedScanning = await waitInterruptible(1200);
      if (!finishedScanning) break;

      setSleepEyeState('closed');
      bodyControls.start({ rotate: 0, transition: { duration: 0.5, ease: 'easeInOut' } });
    }
  }, [bodyControls, waitInterruptible]);

  const runWorkoutIdleLoop = React.useCallback(async (): Promise<void> => {
    await barbellControls.start({ y: 35, opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.5 } });

    while (isIdleRef.current) {
      const variant = Math.floor(Math.random() * 3);
      if (!isIdleRef.current) break;

      // Trunk reaches down
      await trunkControls.start({ scaleY: 1.6, scaleX: 0.9, rotate: 0, transition: { duration: 0.5, ease: 'easeOut' } });
      if (!isIdleRef.current) break;

      if (variant === 0) {
        // Easy & Rapid Lifts
        for (let i = 0; i < 3; i++) {
          if (!isIdleRef.current) break;
          void Promise.all([
            trunkControls.start({ scaleY: 0.5, scaleX: 1.1, transition: { duration: 0.3, ease: 'easeInOut' } }),
            barbellControls.start({ y: -3, transition: { duration: 0.3, ease: 'easeInOut' } }),
          ]);
          await waitInterruptible(350);
          if (!isIdleRef.current) break;
          void Promise.all([
            trunkControls.start({ scaleY: 1.6, scaleX: 0.9, transition: { duration: 0.3, ease: 'easeInOut' } }),
            barbellControls.start({ y: 35, transition: { duration: 0.3, ease: 'easeInOut' } }),
          ]);
          await waitInterruptible(350);
        }
      } else if (variant === 1) {
        // Medium, Form-focused Lift
        void Promise.all([
          trunkControls.start({ scaleY: 0.9, scaleX: 1.05, transition: { duration: 0.4, ease: 'easeOut' } }),
          barbellControls.start({ y: 8, transition: { duration: 0.4, ease: 'easeOut' } }),
          bodyControls.start({ y: 2, transition: { duration: 0.4 } }),
        ]);
        await waitInterruptible(500);
        if (!isIdleRef.current) break;

        void Promise.all([
          trunkControls.start({ scaleY: 0.5, scaleX: 1.15, transition: { duration: 0.4, ease: 'easeOut' } }),
          barbellControls.start({ y: -3, transition: { duration: 0.4, ease: 'easeOut' } }),
          bodyControls.start({ y: -2, transition: { duration: 0.4 } }),
        ]);
        await waitInterruptible(600);
        if (!isIdleRef.current) break;

        void Promise.all([
          trunkControls.start({ scaleY: 1.6, scaleX: 0.9, transition: { duration: 0.5, ease: 'easeIn' } }),
          barbellControls.start({ y: 35, transition: { duration: 0.5, ease: 'easeIn' } }),
          bodyControls.start({ y: 0, transition: { duration: 0.5 } }),
        ]);
        await waitInterruptible(600);
      } else if (variant === 2) {
        // The Struggle!
        setIsHappy(true);

        trunkControls.start({ scaleY: 0.5, scaleX: 1.0, transition: { duration: 1.5, ease: 'linear' } });
        barbellControls.start({ y: -3, transition: { duration: 1.5, ease: 'linear' } });
        bodyControls.start({ x: [-2, 2, -2, 2, -2, 2, -2, 2, 0], transition: { duration: 1.5 } });
        barbellControls.start({ rotate: [-3, 3, -3, 3, -3, 3, 0], transition: { duration: 1.5 } });

        await waitInterruptible(1500);
        if (!isIdleRef.current) break;

        bodyControls.start({ x: [-3, 3, -3, 3, -3, 3, 0], y: [-2, 2, -2, 2, 0], transition: { duration: 0.8 } });
        barbellControls.start({ rotate: [-5, 5, -5, 5, -5, 5, 0], transition: { duration: 0.8 } });
        await waitInterruptible(800);
        if (!isIdleRef.current) break;

        setIsHappy(false);
        void Promise.all([
          trunkControls.start({ scaleY: 1.6, scaleX: 0.9, transition: { duration: 0.15, ease: 'easeIn' } }),
          barbellControls.start({ y: 35, transition: { duration: 0.15, ease: 'easeIn' } }),
          bodyControls.start({ y: [0, 4, 0], transition: { duration: 0.3 } }),
        ]);
        await waitInterruptible(500);

        bodyControls.start({ y: [0, -3, 0, -3, 0, -3, 0], transition: { duration: 1.5, ease: 'easeInOut' } });
        await waitInterruptible(1500);
      }

      // Rest and reset
      await trunkControls.start({ scaleY: 1, scaleX: 1, transition: { duration: 0.5, ease: 'backOut' } });
      await waitInterruptible(1200);
    }
  }, [barbellControls, trunkControls, bodyControls, waitInterruptible]);

  const cancelIdle = React.useCallback(async (): Promise<void> => {
    if (!isIdleRef.current) return;
    isIdleRef.current = false;
    currentIdleModeRef.current = 'none';
    setIsHappy(false);
    setSleepEyeState('closed');

    trunkControls.stop();
    bodyControls.stop();
    foodControls.stop();
    bowlControls.stop();
    barbellControls.stop();

    bowlControls.start({ opacity: 0, y: 20, scale: 0.8, transition: { duration: 0.3 } });
    foodControls.set({ opacity: 0, y: 0, x: 0 });
    barbellControls.start({ opacity: 0, y: 45, scale: 0.8, transition: { duration: 0.3 } });

    await Promise.all([
      trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.3 } }),
      bodyControls.start({ y: 0, x: 0, rotate: 0, transition: { duration: 0.3 } }),
    ]);
  }, [trunkControls, bodyControls, foodControls, bowlControls, barbellControls]);

  // --- IDLE TOGGLE FUNCTIONS ---

  const toggleSaladIdle = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    await clearEquipmentsForIdle();

    isIdleRef.current = true;
    currentIdleModeRef.current = 'salad';
    isAnimating.current = false;
    void runSaladIdleLoop();
  }, [clearEquipmentsForIdle, runSaladIdleLoop]);

  const toggleSleepIdle = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    await clearEquipmentsForIdle('nightcap');

    // Auto-equip nightcap
    if (!isWearingNightcap) {
      nightcapControls.set({ y: -80, opacity: 0, scale: 0.5 });
      await trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });
      nightcapControls.set({ opacity: 1 });
      await Promise.all([
        trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        nightcapControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
      ]);
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingNightcap(true);
    }

    isIdleRef.current = true;
    currentIdleModeRef.current = 'sleep';
    isAnimating.current = false;
    void runSleepIdleLoop();
  }, [clearEquipmentsForIdle, isWearingNightcap, nightcapControls, trunkControls, runSleepIdleLoop]);

  const toggleWorkoutIdle = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    await clearEquipmentsForIdle('headband');

    // Auto-equip headband
    if (!isWearingHeadband) {
      headbandControls.set({ y: -80, opacity: 0, scale: 0.5 });
      await trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });
      headbandControls.set({ opacity: 1 });
      await Promise.all([
        trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        headbandControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
      ]);
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingHeadband(true);
    }

    isIdleRef.current = true;
    currentIdleModeRef.current = 'workout';
    isAnimating.current = false;
    void runWorkoutIdleLoop();
  }, [clearEquipmentsForIdle, isWearingHeadband, headbandControls, trunkControls, runWorkoutIdleLoop]);

  // --- EQUIPMENT TOGGLES ---

  const toggleGlasses = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (!isWearing) {
      glassesControls.set({ y: 60, opacity: 0, scale: 0.8 });
      await trunkControls.start({ scaleY: 1.4, scaleX: 0.85, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });
      glassesControls.set({ opacity: 1 });
      await Promise.all([
        trunkControls.start({ scaleY: -0.7, scaleX: 1.1, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 120, damping: 14 } }),
        glassesControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 120, damping: 14 } }),
      ]);
      await new Promise((r) => setTimeout(r, 200));
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearing(true);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    } else {
      await trunkControls.start({ scaleY: -0.7, scaleX: 1.1, rotate: 0, transition: { duration: 0.4, type: 'spring', stiffness: 120, damping: 14 } });
      await Promise.all([
        trunkControls.start({ scaleY: 1.4, scaleX: 0.85, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        glassesControls.start({ y: 60, scale: 0.8, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
      ]);
      glassesControls.set({ opacity: 0 });
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearing(false);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    }
  }, [isWearing, trunkControls, glassesControls, resumeSurfingIfNeeded]);

  const toggleHelmet = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (!isWearingHelmet) {
      helmetControls.set({ y: -80, opacity: 0, scale: 0.5 });
      await trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });
      helmetControls.set({ opacity: 1 });
      await Promise.all([
        trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 120, damping: 14 } }),
        helmetControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 120, damping: 14 } }),
      ]);
      await new Promise((r) => setTimeout(r, 200));
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingHelmet(true);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    } else {
      await trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.4, type: 'spring', stiffness: 120, damping: 14 } });
      await Promise.all([
        trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        helmetControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }),
      ]);
      helmetControls.set({ opacity: 0, y: -100, scale: 0 });
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingHelmet(false);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    }
  }, [isWearingHelmet, trunkControls, helmetControls, resumeSurfingIfNeeded]);

  const toggleNightcap = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (!isWearingNightcap) {
      nightcapControls.set({ y: -80, opacity: 0, scale: 0.5 });
      await trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });
      nightcapControls.set({ opacity: 1 });
      await Promise.all([
        trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        nightcapControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
      ]);
      await new Promise((r) => setTimeout(r, 200));
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingNightcap(true);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    } else {
      await trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.4, type: 'spring', stiffness: 120, damping: 14 } });
      await Promise.all([
        trunkControls.start({ scaleY: -1.8, scaleX: 0.85, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 14 } }),
        nightcapControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }),
      ]);
      nightcapControls.set({ opacity: 0, y: -100, scale: 0 });
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingNightcap(false);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    }
  }, [isWearingNightcap, trunkControls, nightcapControls, resumeSurfingIfNeeded]);

  const toggleMedic = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (!isWearingMedic) {
      // Spooked shake
      await bodyControls.start({ x: [-4, 4, -4, 4, -2, 2, 0], transition: { duration: 0.4 } });

      medicHatControls.set({ y: -80, opacity: 0, scale: 0.5 });
      stethControls.set({ y: 80, opacity: 0, scale: 0.5 });

      await trunkControls.start({ scaleY: -1.2, scaleX: 1.15, rotate: 0, transition: { duration: 0.3, ease: 'easeOut' } });

      medicHatControls.set({ opacity: 1 });
      stethControls.set({ opacity: 1 });

      await Promise.all([
        medicHatControls.start({ y: 0, scale: 1, transition: { duration: 0.5, type: 'spring', stiffness: 100 } }),
        stethControls.start({ y: 0, scale: 1, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100 } }),
        trunkControls.start({ scaleY: 0.95, scaleX: 1, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100 } }),
      ]);
      setIsWearingMedic(true);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    } else {
      await trunkControls.start({ scaleY: -0.8, scaleX: 1.1, rotate: 0, transition: { duration: 0.3, type: 'spring', stiffness: 120 } });
      await Promise.all([
        trunkControls.start({ scaleY: 1.6, scaleX: 0.8, rotate: 0, transition: { duration: 0.5, type: 'spring', stiffness: 100 } }),
        medicHatControls.start({ y: -100, scale: 0, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }),
        stethControls.start({ y: 80, scale: 0, opacity: 0, rotate: 0, transition: { duration: 0.5, ease: 'easeIn' } }),
      ]);
      medicHatControls.set({ opacity: 0, y: -100, scale: 0 });
      stethControls.set({ opacity: 0, y: 80, scale: 0 });
      await trunkControls.start({ scaleY: 1, scaleX: 1, rotate: 0, transition: { duration: 0.4, ease: 'backOut' } });
      setIsWearingMedic(false);
      isAnimating.current = false;
      resumeSurfingIfNeeded();
    }
  }, [isWearingMedic, bodyControls, trunkControls, medicHatControls, stethControls, resumeSurfingIfNeeded]);

  const toggleSurfing = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (!isSurfing) {
      boardControls.set({ x: -150, opacity: 0 });
      bodyControls.start({ y: -25, rotate: -5, transition: { type: 'spring', stiffness: 200, damping: 15 } });
      await new Promise((r) => setTimeout(r, 200));

      boardControls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 150, damping: 12 } });

      impactSplashControls.start({
        y: [0, -25, 0],
        x: [0, 15, 25],
        scale: [0.5, 1.5, 0],
        opacity: [0, 1, 0],
        transition: { duration: 0.6, ease: 'easeOut' },
      });

      await bodyControls.start({ y: 0, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } });

      const wobble = { repeat: Infinity, repeatType: 'mirror' as const, duration: 1.5, ease: 'easeInOut' as const };
      boardControls.start({ y: [-2, 2], rotate: [-4, 4], transition: wobble });
      bodyControls.start({ y: [-2, 2], rotate: [-4, 4], transition: wobble });
      trunkControls.start({ rotate: [0, -15], transition: wobble });

      setIsSurfing(true);
      isSurfingRef.current = true;
      isAnimating.current = false;
    } else {
      bodyControls.start({ y: -25, rotate: 5, transition: { type: 'spring', stiffness: 200, damping: 15 } });
      await new Promise((r) => setTimeout(r, 200));

      boardControls.start({ x: 150, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } });

      await bodyControls.start({ y: 0, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } });

      boardControls.stop();
      bodyControls.stop();
      trunkControls.stop();
      bodyControls.set({ y: 0, rotate: 0 });
      trunkControls.start({ rotate: 0, transition: { duration: 0.3 } });

      setIsSurfing(false);
      isSurfingRef.current = false;
      isAnimating.current = false;
    }
  }, [isSurfing, boardControls, bodyControls, trunkControls, impactSplashControls]);

  // Greeting animation
  const triggerGreeting = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsHappy(true);

    bodyControls.start({
      y: [0, -15, -12, -15, -12, 0],
      rotate: [0, -12, -8, -12, -8, 0],
      transition: { duration: 1.4, ease: 'easeInOut' },
    });

    await trunkControls.start({
      rotate: [0, -90, -130, -90, -130, 0],
      scaleY: [1, 1.25, 1.1, 1.25, 1.1, 1],
      transition: { duration: 1.4, ease: 'easeInOut' },
    });

    setIsHappy(false);
    isAnimating.current = false;
    resumeSurfingIfNeeded();
  }, [bodyControls, trunkControls, resumeSurfingIfNeeded]);

  const triggerCelebrate = React.useCallback(async (): Promise<void> => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsHappy(true);

    await trunkControls.start({ rotate: 20, scaleY: 0.8, transition: { duration: 0.4, ease: 'easeOut' } });
    trunkControls.start({ rotate: -65, scaleY: -1.7, scaleX: 0.8, transition: { type: 'spring', stiffness: 150, damping: 12 } });
    await new Promise((r) => setTimeout(r, 150));

    sparkControls.start({
      scale: [1, 1.6, 1],
      rotate: [0, 180, 360],
      transition: { duration: 0.6, ease: 'easeInOut' },
    });

    sparkSplashControls.start({
      y: [0, -20, -10],
      x: [0, 20, 30],
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: { duration: 0.6, ease: 'easeOut' },
    });

    bodyControls.start({ y: [0, -8, 0], transition: { duration: 0.5 } });
    await new Promise((r) => setTimeout(r, 500));
    await trunkControls.start({ rotate: 0, scaleY: 1, scaleX: 1, transition: { duration: 0.5, ease: 'backOut' } });

    setIsHappy(false);
    isAnimating.current = false;
    resumeSurfingIfNeeded();
  }, [trunkControls, sparkControls, sparkSplashControls, bodyControls, resumeSurfingIfNeeded]);

  // Expose greeting for imperative calls
  React.useImperativeHandle(ref, () => ({
    triggerGreeting: () => { void triggerGreeting(); }
  }), [triggerGreeting]);

  // Trigger greeting on initial mount only
  React.useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void triggerGreeting();
    }, 800);
    return () => window.clearTimeout(initialTimer);
  }, [triggerGreeting]);

  // Stethoscope "Listening" Pulse Loop (paused when app unfocused)
  React.useEffect(() => {
    if (isWearingMedic && !isAnimating.current && !isIdleRef.current && appFocused) {
      const pulseTransition = { repeat: Infinity, repeatType: 'mirror' as const, duration: 0.6, ease: 'easeInOut' as const };
      const inspectSequence = [0, -12, -12, 0, 0, 12, 12, 0];
      const inspectTimes = [0, 0.1, 0.3, 0.4, 0.6, 0.7, 0.9, 1];
      const inspectTransition = { repeat: Infinity, duration: 6, times: inspectTimes, ease: 'easeInOut' as const };

      trunkControls.start({
        rotate: inspectSequence,
        scaleY: [0.98, 1.02],
        scaleX: [1, 0.99],
        transition: {
          rotate: inspectTransition,
          scaleY: pulseTransition,
          scaleX: pulseTransition,
        },
      });

      stethControls.start({
        rotate: inspectSequence,
        scale: [1, 1.015],
        transition: {
          rotate: inspectTransition,
          scale: pulseTransition,
        },
      });
    } else if (isWearingMedic && !appFocused) {
      trunkControls.stop();
      stethControls.stop();
    }

    return () => {
      trunkControls.stop();
      stethControls.stop();
    };
  }, [isWearingMedic, appFocused, trunkControls, stethControls]);

  // --- CONSOLIDATED POLLING SYNC (paused when app unfocused) ---
  React.useEffect(() => {
    if (!appFocused) return;

    const interval = window.setInterval(() => {
      if (isAnimating.current) return;

      // Idle sync
      if (idleMode !== 'none' && currentIdleModeRef.current !== idleMode) {
        if (isIdleRef.current) void cancelIdle();
        currentIdleModeRef.current = idleMode;
        isIdleRef.current = true;
        if (idleMode === 'salad') void toggleSaladIdle();
        else if (idleMode === 'sleep') void toggleSleepIdle();
        else if (idleMode === 'workout') void toggleWorkoutIdle();
        return;
      }
      if (idleMode === 'none' && isIdleRef.current) {
        void cancelIdle();
        return;
      }

      // Skip headwear/surfing sync when idle
      if (isIdleRef.current) return;

      // Headwear sync
      if (isWearingHelmet && headwear !== 'helmet') {
        void toggleHelmet();
      } else if (isWearingNightcap && headwear !== 'nightcap') {
        void toggleNightcap();
      } else if (isWearingMedic && headwear !== 'medic') {
        void toggleMedic();
      } else if (headwear === 'helmet' && !isWearingHelmet) {
        void toggleHelmet();
      } else if (headwear === 'nightcap' && !isWearingNightcap) {
        void toggleNightcap();
      } else if (headwear === 'medic' && !isWearingMedic) {
        void toggleMedic();
      }

      // Surfing sync
      if (surfingProp !== isSurfingRef.current) {
        void toggleSurfing();
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [appFocused, idleMode, cancelIdle, toggleSaladIdle, toggleSleepIdle, toggleWorkoutIdle,
      headwear, isWearingHelmet, isWearingNightcap, isWearingMedic, toggleHelmet, toggleNightcap, toggleMedic,
      surfingProp, toggleSurfing]);

  // Keep glasses and celebrate accessible
  void toggleGlasses;
  void triggerCelebrate;

  // --- BODY GRID SELECTION ---
  let currentBodyGrid: string[];
  if (isIdleRef.current && currentIdleModeRef.current === 'sleep') {
    if (sleepEyeState === 'left') {
      currentBodyGrid = frame === 0 ? bodySleepLeftOpen1 : bodySleepLeftOpen2;
    } else if (sleepEyeState === 'right') {
      currentBodyGrid = frame === 0 ? bodySleepRightOpen1 : bodySleepRightOpen2;
    } else {
      currentBodyGrid = frame === 0 ? bodySleepClosed1 : bodySleepClosed2;
    }
  } else if (isHappy) {
    currentBodyGrid = frame === 0 ? bodyHappy1 : bodyHappy2;
  } else {
    currentBodyGrid = frame === 0 ? bodyNormal1 : bodyNormal2;
  }

  // --- DYNAMIC SPARK SYSTEM ---
  let activeSparkGrid = frame === 0 ? sparkFrame1 : sparkFrame2;
  let sparkAnim: Record<string, number[]> = { y: [0, 4], x: [0, 0], scale: [1, 1], rotate: [0, 0] };
  let sparkTrans: Record<string, unknown> = { repeat: Infinity, repeatType: 'mirror', duration: 1.5, ease: 'easeInOut' };

  if (isIdleRef.current && currentIdleModeRef.current === 'sleep') {
    activeSparkGrid = moonFrame;
    sparkAnim = { y: [0, -3], x: [2, 2], scale: [1, 1], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 2, ease: 'easeInOut' };
  } else if (isIdleRef.current && currentIdleModeRef.current === 'salad') {
    activeSparkGrid = frame === 0 ? leafFrame1 : leafFrame2;
    sparkAnim = { y: [0, 3], x: [-2, -2], scale: [1, 1], rotate: [0, -8] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 1.25, ease: 'easeInOut' };
  } else if (isIdleRef.current && currentIdleModeRef.current === 'workout') {
    activeSparkGrid = frame === 0 ? sparkFrame1 : sparkFrame2;
    sparkAnim = { y: [0, 4], x: [0, 0], scale: [1.2, 1.2], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 0.5, ease: 'easeInOut' };
  } else if (isWearingMedic) {
    activeSparkGrid = frame === 0 ? heartFrame1 : heartFrame2;
    sparkAnim = { y: [0, 0], x: [0, 0], scale: [1, 1.15], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 0.35, ease: 'easeInOut' };
  } else if (isSurfing) {
    activeSparkGrid = frame === 0 ? surfSpark1 : surfSpark2;
    sparkAnim = { y: [0, 4], x: [0, 0], scale: [1, 1], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 1, ease: 'easeInOut' };
  } else if (isWearingHelmet) {
    activeSparkGrid = frame === 0 ? gearFrame1 : gearFrame2;
    sparkAnim = { y: [0, 0], x: [0, 0], scale: [1, 1], rotate: [0, 360] };
    sparkTrans = { repeat: Infinity, repeatType: 'loop', duration: 5, ease: 'linear' };
  } else if (isWearingNightcap) {
    activeSparkGrid = frame === 0 ? starFrame1 : starFrame2;
    sparkAnim = { y: [0, -4], x: [0, 0], scale: [1, 1.15], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 1.5, ease: 'easeInOut' };
  } else if (isWearing) {
    activeSparkGrid = frame === 0 ? bulbFrame1 : bulbFrame2;
    sparkAnim = { y: [0, -3], x: [0, 0], scale: [1, 1], rotate: [0, 0] };
    sparkTrans = { repeat: Infinity, repeatType: 'mirror', duration: 1, ease: 'easeInOut' };
  }

  // Freeze spark animations when app is unfocused
  if (!appFocused) {
    sparkAnim = { y: [0], x: [0], scale: [1], rotate: [0] };
    sparkTrans = { duration: 0 };
  }

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        animate={floatControls}
        className="relative z-10 flex items-center justify-center"
      >
        <svg
          width={160}
          height={120}
          viewBox="0 0 160 120"
          fill="none"
          className="overflow-visible"
        >
          {/* Surfboard Layer */}
          <motion.g
            animate={boardControls}
            initial={{ opacity: 0 }}
            style={{ originX: '80px', originY: '92px' }}
          >
            <g transform={`translate(${BASE_X - 1 * PIXEL_SIZE}, ${BASE_Y + 11 * PIXEL_SIZE})`}>
              {renderGrid(surfboardGrid)}

              {isSurfing && appFocused && (
                <g transform={`translate(${-1 * PIXEL_SIZE}, ${0})`}>
                  <motion.rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#80D8FF"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: -25, y: -15, opacity: 0, scale: 0.5 }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: 'easeOut' }} />
                  <motion.rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#FFFFFF"
                    initial={{ x: 0, y: 5, opacity: 1, scale: 1 }}
                    animate={{ x: -20, y: 15, opacity: 0, scale: 0.5 }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.2, ease: 'easeOut' }} />
                  <motion.rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#80D8FF"
                    initial={{ x: 5, y: -5, opacity: 1, scale: 1 }}
                    animate={{ x: -15, y: -25, opacity: 0, scale: 0.5 }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.4, ease: 'easeOut' }} />
                </g>
              )}
            </g>

            {/* Impact splash */}
            <g transform={`translate(${BASE_X + 16 * PIXEL_SIZE}, ${BASE_Y + 10 * PIXEL_SIZE})`}>
              <motion.g animate={impactSplashControls} initial={{ opacity: 0 }}>
                <rect x={0} y={0} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#80D8FF" />
                <rect x={PIXEL_SIZE} y={-PIXEL_SIZE} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#FFFFFF" />
                <rect x={PIXEL_SIZE * 2} y={PIXEL_SIZE} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#80D8FF" />
              </motion.g>
            </g>
          </motion.g>

          {/* Spark Layer (outside bodyControls for stability) */}
          <g transform={`translate(${BASE_X - 15}, ${BASE_Y - 15})`}>
            <motion.g
              animate={sparkAnim}
              transition={sparkTrans}
              style={{ originX: `${1.5 * PIXEL_SIZE}px`, originY: `${1.5 * PIXEL_SIZE}px` }}
            >
              <motion.g animate={sparkControls}>
                {renderGrid(activeSparkGrid)}
              </motion.g>
            </motion.g>

            <motion.g animate={sparkSplashControls} initial={{ opacity: 0 }}>
              <rect x={-PIXEL_SIZE} y={-PIXEL_SIZE} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#E68A5C" />
              <rect x={PIXEL_SIZE * 3} y={-PIXEL_SIZE * 2} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#F4D03F" />
              <rect x={PIXEL_SIZE * 2} y={PIXEL_SIZE * 3} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#E68A5C" />
            </motion.g>
          </g>

          {/* Body & Equipments Wrapper */}
          <motion.g
            animate={bodyControls}
            style={{ originX: '80px', originY: '92px' }}
          >
            {/* Bowl Layer */}
            <g transform={`translate(${BASE_X + 3 * PIXEL_SIZE}, ${BASE_Y + 10.5 * PIXEL_SIZE})`}>
              <motion.g animate={bowlControls} initial={{ y: 20, opacity: 0, scale: 0.8 }}>
                {renderGrid(bowlGrid)}
              </motion.g>
            </g>

            {/* Food Particle Layer */}
            <g transform={`translate(${BASE_X + 5 * PIXEL_SIZE}, ${BASE_Y + 10 * PIXEL_SIZE})`}>
              <motion.g animate={foodControls} initial={{ opacity: 0, y: 0, x: 0 }}>
                <rect x={0} y={0} width={PIXEL_SIZE * 1.5} height={PIXEL_SIZE * 1.5} fill={activeFoodColor} />
              </motion.g>
            </g>

            {/* Main Body */}
            <g transform={`translate(${BASE_X}, ${BASE_Y})`}>
              {renderGrid(currentBodyGrid)}
            </g>

            {/* Barbell Layer */}
            <g transform={`translate(${BASE_X}, ${BASE_Y + 7 * PIXEL_SIZE})`}>
              <motion.g
                animate={barbellControls}
                initial={{ y: 45, opacity: 0, scale: 0.8 }}
                style={{ originX: `${8.5 * PIXEL_SIZE}px`, originY: `${1.5 * PIXEL_SIZE}px` }}
              >
                {renderGrid(barbellGrid)}
              </motion.g>
            </g>

            {/* Helmet */}
            <g transform={`translate(${BASE_X}, ${BASE_Y - 5 * PIXEL_SIZE})`}>
              <motion.g animate={helmetControls} initial={{ y: -60, opacity: 0, scale: 0.8 }}>
                {renderGrid(helmetGrid)}
              </motion.g>
            </g>

            {/* Nightcap */}
            <g transform={`translate(${BASE_X}, ${BASE_Y - 5 * PIXEL_SIZE})`}>
              <motion.g animate={nightcapControls} initial={{ y: -60, opacity: 0, scale: 0.8 }}>
                {renderGrid(nightcapGrid)}
              </motion.g>
            </g>

            {/* Headband */}
            <g transform={`translate(${BASE_X}, ${BASE_Y})`}>
              <motion.g animate={headbandControls} initial={{ y: -60, opacity: 0, scale: 0.8 }}>
                {renderGrid(headbandGrid)}
              </motion.g>
            </g>

            {/* Medic Hat */}
            <g transform={`translate(${BASE_X}, ${BASE_Y - 5 * PIXEL_SIZE})`}>
              <motion.g animate={medicHatControls} initial={{ y: -80, opacity: 0, scale: 0.8 }}>
                {renderGrid(medicHatGrid)}
              </motion.g>
            </g>

            {/* Glasses */}
            <g transform={`translate(${BASE_X + 4 * PIXEL_SIZE}, ${BASE_Y + 3 * PIXEL_SIZE})`}>
              <motion.g animate={glassesControls} initial={{ y: 60, opacity: 0, scale: 0.8 }}>
                {renderGrid(glassesGrid)}
              </motion.g>
            </g>

            {/* Trunk */}
            <g transform={`translate(${BASE_X + 6 * PIXEL_SIZE}, ${BASE_Y + 7 * PIXEL_SIZE})`}>
              <motion.g
                style={{
                  originX: `${2.5 * PIXEL_SIZE}px`,
                  originY: `${0.5 * PIXEL_SIZE}px`,
                }}
                animate={trunkControls}
              >
                {isAnimating.current || isIdleRef.current || isWearingMedic
                  ? renderGrid(trunkGridLeft)
                  : (frame === 0 ? renderGrid(trunkGridLeft) : renderGrid(trunkGridRight))}
              </motion.g>
            </g>

            {/* Stethoscope (on top of trunk) */}
            <g transform={`translate(${BASE_X}, ${BASE_Y + 3 * PIXEL_SIZE})`}>
              <motion.g
                animate={stethControls}
                initial={{ y: 80, opacity: 0, scale: 0.8 }}
                style={{ originX: `${8.5 * PIXEL_SIZE}px`, originY: `${1 * PIXEL_SIZE}px` }}
              >
                {renderGrid(stethGrid)}
              </motion.g>
            </g>
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
});
