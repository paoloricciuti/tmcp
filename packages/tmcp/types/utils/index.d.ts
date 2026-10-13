export namespace tool {
    function text(text: string): {
        content: {
            type: "text";
            text: string;
        }[];
    };
    function error(text: string): {
        isError: true;
        content: {
            type: "text";
            text: string;
        }[];
    };
    function media(type: "audio" | "image", data: string, mime_type: string): {
        content: {
            type: "image" | "audio";
            data: string;
            mimeType: string;
        }[];
    };
    function resource(resource: EmbeddedResource["resource"]): {
        content: {
            type: "resource";
            resource: {
                text: string;
                uri: string;
                mimeType?: string | undefined;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | undefined;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            };
        }[];
    };
    function resourceLink(resource_link: Omit<ResourceLink, "type">): {
        content: {
            _meta?: ({} & {
                [key: string]: unknown;
            }) | undefined;
            title?: string | undefined;
            name: string;
            mimeType?: string | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
            }[] | undefined;
            uri: string;
            description?: string | undefined;
            type: "resource_link";
        }[];
    };
    function structured<T extends Record<string, unknown>>(obj: T): {
        content: {
            type: "text";
            text: string;
        }[];
        structuredContent: T;
    };
    function mix<T extends Record<string, unknown> | undefined = undefined>(results: Array<CallToolResult<undefined>>, obj?: T): CallToolResult<T>;
}
export namespace resource {
    function text(uri: string, text: string, mime_type?: string): {
        contents: {
            uri: string;
            text: string;
            mimeType: string | undefined;
        }[];
    };
    function blob(uri: string, blob: string, mime_type?: string): {
        contents: {
            uri: string;
            blob: string;
            mimeType: string | undefined;
        }[];
    };
    function mix(resources: Array<ReadResourceResult>): {
        contents: ({
            text: string;
            uri: string;
            mimeType?: string | undefined;
            _meta?: ({} & {
                [key: string]: unknown;
            }) | undefined;
        } | {
            blob: string;
            uri: string;
            mimeType?: string | undefined;
            _meta?: ({} & {
                [key: string]: unknown;
            }) | undefined;
        })[];
    };
}
export namespace prompt {
    function message(text: string): {
        messages: {
            role: "user";
            content: {
                type: "text";
                text: string;
            };
        }[];
    };
    /**
     * Alias for message
     */
    function text(text: string): {
        messages: {
            role: "user";
            content: {
                type: "text";
                text: string;
            };
        }[];
    };
    function media(type: "audio" | "image", data: string, mime_type: string): {
        messages: {
            role: "user";
            content: {
                type: "image" | "audio";
                data: string;
                mimeType: string;
            };
        }[];
    };
    function resource(resource: EmbeddedResource["resource"]): {
        messages: {
            role: "user";
            content: {
                type: "resource";
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                };
            };
        }[];
    };
    function resourceLink(resource: Omit<ResourceLink, "type">): {
        messages: {
            role: "user";
            content: {
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
                title?: string | undefined;
                name: string;
                mimeType?: string | undefined;
                icons?: {
                    src: string;
                    mimeType?: string | undefined;
                    sizes?: string[] | undefined;
                }[] | undefined;
                uri: string;
                description?: string | undefined;
                type: "resource_link";
            };
        }[];
    };
    function mix(messages: Array<GetPromptResult>): {
        messages: {
            role: "user" | "assistant";
            content: {
                type: "text";
                text: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "image";
                data: string;
                mimeType: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "audio";
                data: string;
                mimeType: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "resource_link";
                icons?: {
                    src: string;
                    mimeType?: string | undefined;
                    sizes?: string[] | undefined;
                }[] | undefined;
                uri: string;
                description?: string | undefined;
                mimeType?: string | undefined;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
                name: string;
                title?: string | undefined;
            } | {
                type: "resource";
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                };
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            };
        }[];
    };
    function messages(messages: Array<string>): {
        messages: {
            role: "user";
            content: {
                type: "text";
                text: string;
            };
        }[];
    };
    /**
     * @deprecated Use `mix` instead
     */
    function various(messages: Array<GetPromptResult["messages"][number]["content"]>): {
        messages: {
            role: "user";
            content: {
                type: "text";
                text: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "image";
                data: string;
                mimeType: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "audio";
                data: string;
                mimeType: string;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                type: "resource_link";
                icons?: {
                    src: string;
                    mimeType?: string | undefined;
                    sizes?: string[] | undefined;
                }[] | undefined;
                uri: string;
                description?: string | undefined;
                mimeType?: string | undefined;
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
                name: string;
                title?: string | undefined;
            } | {
                type: "resource";
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | undefined;
                    _meta?: ({} & {
                        [key: string]: unknown;
                    }) | undefined;
                };
                _meta?: ({} & {
                    [key: string]: unknown;
                }) | undefined;
            };
        }[];
    };
}
export namespace complete {
    function values(values: Array<string>, has_more?: boolean, total?: number): {
        completion: {
            values: string[];
            hasMore: boolean | undefined;
            total: number | undefined;
        };
    };
}
import type { EmbeddedResource } from "../validation/index.js";
import type { ResourceLink } from "../validation/index.js";
import type { CallToolResult } from "../index.js";
import type { ReadResourceResult } from "../validation/index.js";
import type { GetPromptResult } from "../validation/index.js";
//# sourceMappingURL=index.d.ts.map