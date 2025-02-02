export const resolveRHS = async (
  lhs: string,
  relation: string
): Promise<[Error, null] | [null, { [key: string]: any }]> => {
  if (relation === "formatted-phrase") {
    return [null, { value: lhs.replace(/ +/g, " ").trim() }];
  } else {
    return [Error("Unhandled: " + relation), null];
  }
};
