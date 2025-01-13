// Base types will use a string based type-discriminator for results

export type SuccessBase = {
    status:'success'
};

/**
 * Of course, it can still be up to implementers to determine what is a failure.
 * For example, a network error / exception is probably always status===failure,
 * but what about finding no results for a search?
 * I'd argue best practice is to treat that as a success (but with no data)
 *  so it's easier to know when somethings fundamentally gone wrong (failure).
 */
export type FailureBase = {
    status:'failure'
};