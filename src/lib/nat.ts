const sequence = <T>(cmd: string): T[] => {
  const result: T[] = [];
  const parts = cmd.split(" ");
  const start = Number(parts[0]);
  const end = Number(parts[2]);

  for (let i = start; i <= end; i++) {
    console.log(i);
    result.push(i as any);
  }

  return result;
};

export default { sequence };
