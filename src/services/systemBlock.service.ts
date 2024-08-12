import { BlockingStatusModel, ValidationRules } from '../landings/types/systemBlock';

export const getBlockingStatus = async (name: string) : Promise<Boolean> => {
    const data : any = await BlockingStatusModel.findOne( {name} );

    return data ? data.status : false;
};

export const seedBlockingRules = async (): Promise<any> => {
    const rules = [
        {name: ValidationRules.THREE_C, status: true},
        {name: ValidationRules.THREE_D, status: true},
        {name: ValidationRules.FOUR_A, status: false},
        {name: ValidationRules.FOUR_B, status: false}
    ];

    await Promise.all(rules.map((rule) => setSystemBlockRules(rule)));
};

export const setSystemBlockRules = async (rule: {name: string, status: boolean}) => {
    await BlockingStatusModel.findOneAndUpdate(
        {
            name: rule.name
        },
        rule,
        {
            new: true,
            upsert: true
        }
    );
};