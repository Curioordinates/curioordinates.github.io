import * as fs from 'fs';
import { FactionParams } from '../faction-types'

export const runAction = async ({input,output}: FactionParams): Promise<void> => {
    const dataObject = await input.readJson()

    if (dataObject.items) {
        for (const item of dataObject.items) {
            output.writeJson({ name: item.title ?? '', data: item });
        }
    } // else - nothing to do
}