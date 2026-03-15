import { ParseResult, Schema } from 'effect';

export const EmptyPayloadSchema = Schema.Struct({});

const ParseIssueSchema = Schema.Struct({
  path: Schema.Array(Schema.String),
  message: Schema.String
});

const DecodeStageSchema = Schema.Literal('request', 'response', 'error');

export class IpcDecodeError extends Schema.TaggedError<IpcDecodeError>('arkwatch/effect/IpcDecodeError')(
  'IpcDecodeError',
  {
    stage: DecodeStageSchema,
    issues: Schema.Array(ParseIssueSchema)
  }
) {}

export class IpcUnexpectedError extends Schema.TaggedError<IpcUnexpectedError>('arkwatch/effect/IpcUnexpectedError')(
  'IpcUnexpectedError',
  {
    message: Schema.String
  }
) {}

export class IpcTransportError extends Schema.TaggedError<IpcTransportError>('arkwatch/effect/IpcTransportError')(
  'IpcTransportError',
  {
    message: Schema.String
  }
) {}

export const IpcProtocolErrorSchema = Schema.Union(IpcDecodeError, IpcUnexpectedError);
export const IpcClientErrorSchema = Schema.Union(IpcDecodeError, IpcUnexpectedError, IpcTransportError);

export type IpcProtocolError = Schema.Schema.Type<typeof IpcProtocolErrorSchema>;
export type IpcClientError = Schema.Schema.Type<typeof IpcClientErrorSchema>;
export type SchemaWithNoContext = Schema.Schema.All;

export interface IpcContract<
  Channel extends string,
  RequestSchema extends SchemaWithNoContext,
  SuccessSchema extends SchemaWithNoContext,
  ErrorSchema extends SchemaWithNoContext,
  RemoteErrorSchema extends SchemaWithNoContext,
  ResponseSchema extends SchemaWithNoContext
> {
  readonly channel: Channel;
  readonly request: RequestSchema;
  readonly success: SuccessSchema;
  readonly error: ErrorSchema;
  readonly remoteError: RemoteErrorSchema;
  readonly response: ResponseSchema;
}

export type AnyIpcContract = IpcContract<
  string,
  SchemaWithNoContext,
  SchemaWithNoContext,
  SchemaWithNoContext,
  SchemaWithNoContext,
  SchemaWithNoContext
>;
export type ContractRequest<TContract extends AnyIpcContract> = Schema.Schema.Type<TContract['request']>;
export type ContractSuccess<TContract extends AnyIpcContract> = Schema.Schema.Type<TContract['success']>;
export type ContractRemoteError<TContract extends AnyIpcContract> = Schema.Schema.Type<TContract['remoteError']>;
export type ContractClientError<TContract extends AnyIpcContract> = ContractRemoteError<TContract> | IpcDecodeError | IpcUnexpectedError | IpcTransportError;
export type ContractResponse<TContract extends AnyIpcContract> = Schema.Schema.Type<TContract['response']>;

export const defineIpcContract = <
  const Channel extends string,
  RequestSchema extends SchemaWithNoContext,
  SuccessSchema extends SchemaWithNoContext,
  ErrorSchema extends SchemaWithNoContext
>(definition: {
  readonly channel: Channel;
  readonly request: RequestSchema;
  readonly success: SuccessSchema;
  readonly error: ErrorSchema;
}): IpcContract<
  Channel,
  RequestSchema,
  SuccessSchema,
  ErrorSchema,
  Schema.Union<[ErrorSchema, typeof IpcProtocolErrorSchema]>,
  Schema.Union<[
    Schema.Struct<{
      _tag: Schema.Literal<['Success']>;
      payload: SuccessSchema;
    }>,
    Schema.Struct<{
      _tag: Schema.Literal<['Failure']>;
      error: Schema.Union<[ErrorSchema, typeof IpcProtocolErrorSchema]>;
    }>
  ]>
> => {
  const remoteError = Schema.Union(definition.error, IpcProtocolErrorSchema);
  const response = Schema.Union(
    Schema.Struct({
      _tag: Schema.Literal('Success'),
      payload: definition.success
    }),
    Schema.Struct({
      _tag: Schema.Literal('Failure'),
      error: remoteError
    })
  );

  return {
    ...definition,
    remoteError,
    response
  };
};

export const serializeParseError = (
  stage: Schema.Schema.Type<typeof DecodeStageSchema>,
  error: ParseResult.ParseError
): IpcDecodeError =>
  new IpcDecodeError({
    stage,
    issues: ParseResult.ArrayFormatter.formatErrorSync(error).map((issue) => ({
      path: issue.path.map(String),
      message: issue.message
    }))
  });


