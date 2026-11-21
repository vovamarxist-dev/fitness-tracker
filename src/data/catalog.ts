import raw from './catalog.json';
import type { CatalogExercise, Equipment, Lang, MuscleGroup } from '../logic/types';

export const CATALOG = raw as CatalogExercise[];

export const GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'calves', 'abs', 'forearms'];

export const GROUP_LABEL: Record<Lang, Record<MuscleGroup, string>> = {
  ru: {
    chest: 'Грудь', back: 'Спина', shoulders: 'Плечи', biceps: 'Бицепс', triceps: 'Трицепс',
    forearms: 'Предплечья', legs: 'Ноги', glutes: 'Ягодицы', calves: 'Икры', abs: 'Пресс', other: 'Другое',
  },
  en: {
    chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
    forearms: 'Forearms', legs: 'Legs', glutes: 'Glutes', calves: 'Calves', abs: 'Abs', other: 'Other',
  },
};

export const EQUIP_LABEL: Record<Lang, Record<Equipment, string>> = {
  ru: {
    barbell: 'Штанга', smith: 'Машина Смита', ezbar: 'EZ-гриф', dumbbell: 'Гантели', machine: 'Тренажёр',
    cable: 'Блок', body: 'Свой вес', kettlebell: 'Гиря',
  },
  en: {
    barbell: 'Barbell', smith: 'Smith machine', ezbar: 'EZ bar', dumbbell: 'Dumbbells', machine: 'Machine',
    cable: 'Cable', body: 'Bodyweight', kettlebell: 'Kettlebell',
  },
};

const MUSCLE_RU: Record<string, string> = {
  chest: 'грудные', lats: 'широчайшие', 'middle back': 'середина спины', 'lower back': 'поясница', traps: 'трапеции',
  shoulders: 'дельты', biceps: 'бицепс', triceps: 'трицепс', forearms: 'предплечья', quadriceps: 'квадрицепс',
  hamstrings: 'бицепс бедра', adductors: 'приводящие', abductors: 'отводящие', glutes: 'ягодичные', calves: 'икры',
  abdominals: 'пресс', neck: 'шея',
};

export const muscleLabel = (m: string, lang: Lang) => (lang === 'ru' ? MUSCLE_RU[m] ?? m : m);

const byId = new Map(CATALOG.map((e) => [e.id, e]));
let customById = new Map<string, CatalogExercise>();

export function setCustomExercises(list: CatalogExercise[]) {
  customById = new Map(list.map((e) => [e.id, e]));
}

export function getExercise(id: string): CatalogExercise | undefined {
  return byId.get(id) ?? customById.get(id);
}

export function allExercises(): CatalogExercise[] {
  return [...customById.values(), ...CATALOG];
}

export const exName = (e: CatalogExercise | undefined, lang: Lang) => (e ? (lang === 'ru' ? e.ru : e.en) : '—');
