const storage: { [key: string]: number } = {};

export const incrementNamedCounter = (counterName: string) => {
  let current: number = storage[counterName] ?? 0;
  storage[counterName] = ++current;
};

export const getNamedCountersAsMap = () => storage;
