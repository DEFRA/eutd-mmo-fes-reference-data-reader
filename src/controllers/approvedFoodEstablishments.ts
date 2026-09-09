import { Establishment } from '../interfaces/approvedFoodEstablishments.interface';
import {
  getProcessingPlants as getCachedProcessingPlants,
  getStorageFacilities as getCachedStorageFacilities,
} from '../data/cache';

export const getApprovedProcessingPlants = (): Establishment[] => getCachedProcessingPlants();

export const getApprovedStorageFacilities = (): Establishment[] => getCachedStorageFacilities();
