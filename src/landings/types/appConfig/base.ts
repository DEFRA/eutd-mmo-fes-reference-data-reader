import { Schema, Document, model } from 'mongoose';

export const baseConfig = {
    discriminationKey: '_type',
    collection: 'applicationData'
};

export type IApplicationData = Document

export const ApplicationData = model<IApplicationData>('ApplicationData', new Schema({}, baseConfig));