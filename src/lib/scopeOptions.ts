import type { Facility } from './types';
import { COMMANDS, divisionsFor, brigadesFor, battalionsFor } from './catalog';

type ScopeFacility = Pick<Facility, 'command' | 'division' | 'brigade' | 'battalion'>;

const NONE = 'ללא';

function uniqSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set(values.filter((v): v is string => !!v && v.trim() !== ''));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
}

// Ensures "ללא" is always available and listed first.
function noneFirst(values: string[]): string[] {
  return [NONE, ...values.filter((v) => v !== NONE)];
}

export function commandOptions(facilities: ScopeFacility[]): string[] {
  return uniqSorted([...COMMANDS, ...facilities.map((f) => f.command)]);
}

export function divisionOptions(facilities: ScopeFacility[], command: string | null | undefined): string[] {
  const fromData = facilities
    .filter((f) => !command || f.command === command)
    .map((f) => f.division);
  return uniqSorted([...(command ? divisionsFor(command) : []), ...fromData]);
}

export function brigadeOptions(facilities: ScopeFacility[], command: string | null | undefined, division: string | null | undefined): string[] {
  const fromData = facilities
    .filter((f) => (!command || f.command === command) && (!division || f.division === division))
    .map((f) => f.brigade);
  return noneFirst(uniqSorted([...(division ? brigadesFor(division) : []), ...fromData]));
}

export function battalionOptions(facilities: ScopeFacility[], command: string | null | undefined, division: string | null | undefined, brigade: string | null | undefined): string[] {
  const fromData = facilities
    .filter((f) => (!command || f.command === command) && (!division || f.division === division) && (!brigade || f.brigade === brigade))
    .map((f) => f.battalion);
  return noneFirst(uniqSorted([...(brigade ? battalionsFor(brigade) : []), ...fromData]));
}
