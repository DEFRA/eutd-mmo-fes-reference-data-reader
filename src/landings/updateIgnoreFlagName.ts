import * as CatchCertService from './persistence/catchCert';

export const updateIgnoreFlagName = async () => {
  const catchCerts = await CatchCertService.getAllCatchCertsWithProducts();

  const certsToUpdate = catchCerts.filter(hasProductsToUpdate);
  certsToUpdate.forEach((cert) => {
    const newProducts = updateProducts(cert);
    CatchCertService.upsertProductsByIgnore(newProducts, cert.documentNumber);
  });
};

export const hasLandingsToUpdate = (product: any): boolean =>
  (product?.caughtBy)
    ? product.caughtBy.some(landing => landing?._ignore)
    : false;

export const hasProductsToUpdate = (cert: any): boolean =>
  (cert.exportData?.products)
    ? cert.exportData.products.some(hasLandingsToUpdate)
    : false;

export const updateCaughtBy = (caughtBy) => {
  return caughtBy.map(({ _ignore, ...rest }) =>
    _ignore
      ? { ...rest, vesselOverriddenByAdmin: _ignore }
      : { ...rest }
  );
}

export const updateProducts = (cert) =>
  cert.exportData.products.map((prod: any) =>
    (prod.caughtBy)
      ? { ...prod, caughtBy: updateCaughtBy(prod.caughtBy) }
      : prod
  );