import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace";
/**
 * Model CanvasSnapshot
 *
 */
export type CanvasSnapshotModel = runtime.Types.Result.DefaultSelection<Prisma.$CanvasSnapshotPayload>;
export type AggregateCanvasSnapshot = {
    _count: CanvasSnapshotCountAggregateOutputType | null;
    _avg: CanvasSnapshotAvgAggregateOutputType | null;
    _sum: CanvasSnapshotSumAggregateOutputType | null;
    _min: CanvasSnapshotMinAggregateOutputType | null;
    _max: CanvasSnapshotMaxAggregateOutputType | null;
};
export type CanvasSnapshotAvgAggregateOutputType = {
    elementCount: number | null;
};
export type CanvasSnapshotSumAggregateOutputType = {
    elementCount: number | null;
};
export type CanvasSnapshotMinAggregateOutputType = {
    fileId: string | null;
    elementCount: number | null;
    syncedAt: Date | null;
};
export type CanvasSnapshotMaxAggregateOutputType = {
    fileId: string | null;
    elementCount: number | null;
    syncedAt: Date | null;
};
export type CanvasSnapshotCountAggregateOutputType = {
    fileId: number;
    elements: number;
    appState: number;
    elementCount: number;
    syncedAt: number;
    _all: number;
};
export type CanvasSnapshotAvgAggregateInputType = {
    elementCount?: true;
};
export type CanvasSnapshotSumAggregateInputType = {
    elementCount?: true;
};
export type CanvasSnapshotMinAggregateInputType = {
    fileId?: true;
    elementCount?: true;
    syncedAt?: true;
};
export type CanvasSnapshotMaxAggregateInputType = {
    fileId?: true;
    elementCount?: true;
    syncedAt?: true;
};
export type CanvasSnapshotCountAggregateInputType = {
    fileId?: true;
    elements?: true;
    appState?: true;
    elementCount?: true;
    syncedAt?: true;
    _all?: true;
};
export type CanvasSnapshotAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which CanvasSnapshot to aggregate.
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of CanvasSnapshots to fetch.
     */
    orderBy?: Prisma.CanvasSnapshotOrderByWithRelationInput | Prisma.CanvasSnapshotOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.CanvasSnapshotWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` CanvasSnapshots from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` CanvasSnapshots.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned CanvasSnapshots
    **/
    _count?: true | CanvasSnapshotCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
    **/
    _avg?: CanvasSnapshotAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
    **/
    _sum?: CanvasSnapshotSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: CanvasSnapshotMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: CanvasSnapshotMaxAggregateInputType;
};
export type GetCanvasSnapshotAggregateType<T extends CanvasSnapshotAggregateArgs> = {
    [P in keyof T & keyof AggregateCanvasSnapshot]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateCanvasSnapshot[P]> : Prisma.GetScalarType<T[P], AggregateCanvasSnapshot[P]>;
};
export type CanvasSnapshotGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CanvasSnapshotWhereInput;
    orderBy?: Prisma.CanvasSnapshotOrderByWithAggregationInput | Prisma.CanvasSnapshotOrderByWithAggregationInput[];
    by: Prisma.CanvasSnapshotScalarFieldEnum[] | Prisma.CanvasSnapshotScalarFieldEnum;
    having?: Prisma.CanvasSnapshotScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: CanvasSnapshotCountAggregateInputType | true;
    _avg?: CanvasSnapshotAvgAggregateInputType;
    _sum?: CanvasSnapshotSumAggregateInputType;
    _min?: CanvasSnapshotMinAggregateInputType;
    _max?: CanvasSnapshotMaxAggregateInputType;
};
export type CanvasSnapshotGroupByOutputType = {
    fileId: string;
    elements: runtime.JsonValue;
    appState: runtime.JsonValue;
    elementCount: number;
    syncedAt: Date;
    _count: CanvasSnapshotCountAggregateOutputType | null;
    _avg: CanvasSnapshotAvgAggregateOutputType | null;
    _sum: CanvasSnapshotSumAggregateOutputType | null;
    _min: CanvasSnapshotMinAggregateOutputType | null;
    _max: CanvasSnapshotMaxAggregateOutputType | null;
};
export type GetCanvasSnapshotGroupByPayload<T extends CanvasSnapshotGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<CanvasSnapshotGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof CanvasSnapshotGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], CanvasSnapshotGroupByOutputType[P]> : Prisma.GetScalarType<T[P], CanvasSnapshotGroupByOutputType[P]>;
}>>;
export type CanvasSnapshotWhereInput = {
    AND?: Prisma.CanvasSnapshotWhereInput | Prisma.CanvasSnapshotWhereInput[];
    OR?: Prisma.CanvasSnapshotWhereInput[];
    NOT?: Prisma.CanvasSnapshotWhereInput | Prisma.CanvasSnapshotWhereInput[];
    fileId?: Prisma.StringFilter<"CanvasSnapshot"> | string;
    elements?: Prisma.JsonFilter<"CanvasSnapshot">;
    appState?: Prisma.JsonFilter<"CanvasSnapshot">;
    elementCount?: Prisma.IntFilter<"CanvasSnapshot"> | number;
    syncedAt?: Prisma.DateTimeFilter<"CanvasSnapshot"> | Date | string;
    file?: Prisma.XOR<Prisma.FileScalarRelationFilter, Prisma.FileWhereInput>;
};
export type CanvasSnapshotOrderByWithRelationInput = {
    fileId?: Prisma.SortOrder;
    elements?: Prisma.SortOrder;
    appState?: Prisma.SortOrder;
    elementCount?: Prisma.SortOrder;
    syncedAt?: Prisma.SortOrder;
    file?: Prisma.FileOrderByWithRelationInput;
};
export type CanvasSnapshotWhereUniqueInput = Prisma.AtLeast<{
    fileId?: string;
    AND?: Prisma.CanvasSnapshotWhereInput | Prisma.CanvasSnapshotWhereInput[];
    OR?: Prisma.CanvasSnapshotWhereInput[];
    NOT?: Prisma.CanvasSnapshotWhereInput | Prisma.CanvasSnapshotWhereInput[];
    elements?: Prisma.JsonFilter<"CanvasSnapshot">;
    appState?: Prisma.JsonFilter<"CanvasSnapshot">;
    elementCount?: Prisma.IntFilter<"CanvasSnapshot"> | number;
    syncedAt?: Prisma.DateTimeFilter<"CanvasSnapshot"> | Date | string;
    file?: Prisma.XOR<Prisma.FileScalarRelationFilter, Prisma.FileWhereInput>;
}, "fileId">;
export type CanvasSnapshotOrderByWithAggregationInput = {
    fileId?: Prisma.SortOrder;
    elements?: Prisma.SortOrder;
    appState?: Prisma.SortOrder;
    elementCount?: Prisma.SortOrder;
    syncedAt?: Prisma.SortOrder;
    _count?: Prisma.CanvasSnapshotCountOrderByAggregateInput;
    _avg?: Prisma.CanvasSnapshotAvgOrderByAggregateInput;
    _max?: Prisma.CanvasSnapshotMaxOrderByAggregateInput;
    _min?: Prisma.CanvasSnapshotMinOrderByAggregateInput;
    _sum?: Prisma.CanvasSnapshotSumOrderByAggregateInput;
};
export type CanvasSnapshotScalarWhereWithAggregatesInput = {
    AND?: Prisma.CanvasSnapshotScalarWhereWithAggregatesInput | Prisma.CanvasSnapshotScalarWhereWithAggregatesInput[];
    OR?: Prisma.CanvasSnapshotScalarWhereWithAggregatesInput[];
    NOT?: Prisma.CanvasSnapshotScalarWhereWithAggregatesInput | Prisma.CanvasSnapshotScalarWhereWithAggregatesInput[];
    fileId?: Prisma.StringWithAggregatesFilter<"CanvasSnapshot"> | string;
    elements?: Prisma.JsonWithAggregatesFilter<"CanvasSnapshot">;
    appState?: Prisma.JsonWithAggregatesFilter<"CanvasSnapshot">;
    elementCount?: Prisma.IntWithAggregatesFilter<"CanvasSnapshot"> | number;
    syncedAt?: Prisma.DateTimeWithAggregatesFilter<"CanvasSnapshot"> | Date | string;
};
export type CanvasSnapshotCreateInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: number;
    syncedAt?: Date | string;
    file: Prisma.FileCreateNestedOneWithoutCanvasInput;
};
export type CanvasSnapshotUncheckedCreateInput = {
    fileId: string;
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: number;
    syncedAt?: Date | string;
};
export type CanvasSnapshotUpdateInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    file?: Prisma.FileUpdateOneRequiredWithoutCanvasNestedInput;
};
export type CanvasSnapshotUncheckedUpdateInput = {
    fileId?: Prisma.StringFieldUpdateOperationsInput | string;
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CanvasSnapshotCreateManyInput = {
    fileId: string;
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: number;
    syncedAt?: Date | string;
};
export type CanvasSnapshotUpdateManyMutationInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CanvasSnapshotUncheckedUpdateManyInput = {
    fileId?: Prisma.StringFieldUpdateOperationsInput | string;
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CanvasSnapshotNullableScalarRelationFilter = {
    is?: Prisma.CanvasSnapshotWhereInput | null;
    isNot?: Prisma.CanvasSnapshotWhereInput | null;
};
export type CanvasSnapshotCountOrderByAggregateInput = {
    fileId?: Prisma.SortOrder;
    elements?: Prisma.SortOrder;
    appState?: Prisma.SortOrder;
    elementCount?: Prisma.SortOrder;
    syncedAt?: Prisma.SortOrder;
};
export type CanvasSnapshotAvgOrderByAggregateInput = {
    elementCount?: Prisma.SortOrder;
};
export type CanvasSnapshotMaxOrderByAggregateInput = {
    fileId?: Prisma.SortOrder;
    elementCount?: Prisma.SortOrder;
    syncedAt?: Prisma.SortOrder;
};
export type CanvasSnapshotMinOrderByAggregateInput = {
    fileId?: Prisma.SortOrder;
    elementCount?: Prisma.SortOrder;
    syncedAt?: Prisma.SortOrder;
};
export type CanvasSnapshotSumOrderByAggregateInput = {
    elementCount?: Prisma.SortOrder;
};
export type CanvasSnapshotCreateNestedOneWithoutFileInput = {
    create?: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
    connectOrCreate?: Prisma.CanvasSnapshotCreateOrConnectWithoutFileInput;
    connect?: Prisma.CanvasSnapshotWhereUniqueInput;
};
export type CanvasSnapshotUncheckedCreateNestedOneWithoutFileInput = {
    create?: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
    connectOrCreate?: Prisma.CanvasSnapshotCreateOrConnectWithoutFileInput;
    connect?: Prisma.CanvasSnapshotWhereUniqueInput;
};
export type CanvasSnapshotUpdateOneWithoutFileNestedInput = {
    create?: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
    connectOrCreate?: Prisma.CanvasSnapshotCreateOrConnectWithoutFileInput;
    upsert?: Prisma.CanvasSnapshotUpsertWithoutFileInput;
    disconnect?: Prisma.CanvasSnapshotWhereInput | boolean;
    delete?: Prisma.CanvasSnapshotWhereInput | boolean;
    connect?: Prisma.CanvasSnapshotWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.CanvasSnapshotUpdateToOneWithWhereWithoutFileInput, Prisma.CanvasSnapshotUpdateWithoutFileInput>, Prisma.CanvasSnapshotUncheckedUpdateWithoutFileInput>;
};
export type CanvasSnapshotUncheckedUpdateOneWithoutFileNestedInput = {
    create?: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
    connectOrCreate?: Prisma.CanvasSnapshotCreateOrConnectWithoutFileInput;
    upsert?: Prisma.CanvasSnapshotUpsertWithoutFileInput;
    disconnect?: Prisma.CanvasSnapshotWhereInput | boolean;
    delete?: Prisma.CanvasSnapshotWhereInput | boolean;
    connect?: Prisma.CanvasSnapshotWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.CanvasSnapshotUpdateToOneWithWhereWithoutFileInput, Prisma.CanvasSnapshotUpdateWithoutFileInput>, Prisma.CanvasSnapshotUncheckedUpdateWithoutFileInput>;
};
export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type CanvasSnapshotCreateWithoutFileInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: number;
    syncedAt?: Date | string;
};
export type CanvasSnapshotUncheckedCreateWithoutFileInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: number;
    syncedAt?: Date | string;
};
export type CanvasSnapshotCreateOrConnectWithoutFileInput = {
    where: Prisma.CanvasSnapshotWhereUniqueInput;
    create: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
};
export type CanvasSnapshotUpsertWithoutFileInput = {
    update: Prisma.XOR<Prisma.CanvasSnapshotUpdateWithoutFileInput, Prisma.CanvasSnapshotUncheckedUpdateWithoutFileInput>;
    create: Prisma.XOR<Prisma.CanvasSnapshotCreateWithoutFileInput, Prisma.CanvasSnapshotUncheckedCreateWithoutFileInput>;
    where?: Prisma.CanvasSnapshotWhereInput;
};
export type CanvasSnapshotUpdateToOneWithWhereWithoutFileInput = {
    where?: Prisma.CanvasSnapshotWhereInput;
    data: Prisma.XOR<Prisma.CanvasSnapshotUpdateWithoutFileInput, Prisma.CanvasSnapshotUncheckedUpdateWithoutFileInput>;
};
export type CanvasSnapshotUpdateWithoutFileInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CanvasSnapshotUncheckedUpdateWithoutFileInput = {
    elements?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    appState?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    elementCount?: Prisma.IntFieldUpdateOperationsInput | number;
    syncedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CanvasSnapshotSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    fileId?: boolean;
    elements?: boolean;
    appState?: boolean;
    elementCount?: boolean;
    syncedAt?: boolean;
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["canvasSnapshot"]>;
export type CanvasSnapshotSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    fileId?: boolean;
    elements?: boolean;
    appState?: boolean;
    elementCount?: boolean;
    syncedAt?: boolean;
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["canvasSnapshot"]>;
export type CanvasSnapshotSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    fileId?: boolean;
    elements?: boolean;
    appState?: boolean;
    elementCount?: boolean;
    syncedAt?: boolean;
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["canvasSnapshot"]>;
export type CanvasSnapshotSelectScalar = {
    fileId?: boolean;
    elements?: boolean;
    appState?: boolean;
    elementCount?: boolean;
    syncedAt?: boolean;
};
export type CanvasSnapshotOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"fileId" | "elements" | "appState" | "elementCount" | "syncedAt", ExtArgs["result"]["canvasSnapshot"]>;
export type CanvasSnapshotInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
};
export type CanvasSnapshotIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
};
export type CanvasSnapshotIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    file?: boolean | Prisma.FileDefaultArgs<ExtArgs>;
};
export type $CanvasSnapshotPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "CanvasSnapshot";
    objects: {
        file: Prisma.$FilePayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        fileId: string;
        elements: runtime.JsonValue;
        appState: runtime.JsonValue;
        elementCount: number;
        syncedAt: Date;
    }, ExtArgs["result"]["canvasSnapshot"]>;
    composites: {};
};
export type CanvasSnapshotGetPayload<S extends boolean | null | undefined | CanvasSnapshotDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload, S>;
export type CanvasSnapshotCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<CanvasSnapshotFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: CanvasSnapshotCountAggregateInputType | true;
};
export interface CanvasSnapshotDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['CanvasSnapshot'];
        meta: {
            name: 'CanvasSnapshot';
        };
    };
    /**
     * Find zero or one CanvasSnapshot that matches the filter.
     * @param {CanvasSnapshotFindUniqueArgs} args - Arguments to find a CanvasSnapshot
     * @example
     * // Get one CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CanvasSnapshotFindUniqueArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotFindUniqueArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one CanvasSnapshot that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CanvasSnapshotFindUniqueOrThrowArgs} args - Arguments to find a CanvasSnapshot
     * @example
     * // Get one CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CanvasSnapshotFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first CanvasSnapshot that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotFindFirstArgs} args - Arguments to find a CanvasSnapshot
     * @example
     * // Get one CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CanvasSnapshotFindFirstArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotFindFirstArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first CanvasSnapshot that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotFindFirstOrThrowArgs} args - Arguments to find a CanvasSnapshot
     * @example
     * // Get one CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CanvasSnapshotFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more CanvasSnapshots that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CanvasSnapshots
     * const canvasSnapshots = await prisma.canvasSnapshot.findMany()
     *
     * // Get first 10 CanvasSnapshots
     * const canvasSnapshots = await prisma.canvasSnapshot.findMany({ take: 10 })
     *
     * // Only select the `fileId`
     * const canvasSnapshotWithFileIdOnly = await prisma.canvasSnapshot.findMany({ select: { fileId: true } })
     *
     */
    findMany<T extends CanvasSnapshotFindManyArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a CanvasSnapshot.
     * @param {CanvasSnapshotCreateArgs} args - Arguments to create a CanvasSnapshot.
     * @example
     * // Create one CanvasSnapshot
     * const CanvasSnapshot = await prisma.canvasSnapshot.create({
     *   data: {
     *     // ... data to create a CanvasSnapshot
     *   }
     * })
     *
     */
    create<T extends CanvasSnapshotCreateArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotCreateArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many CanvasSnapshots.
     * @param {CanvasSnapshotCreateManyArgs} args - Arguments to create many CanvasSnapshots.
     * @example
     * // Create many CanvasSnapshots
     * const canvasSnapshot = await prisma.canvasSnapshot.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends CanvasSnapshotCreateManyArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many CanvasSnapshots and returns the data saved in the database.
     * @param {CanvasSnapshotCreateManyAndReturnArgs} args - Arguments to create many CanvasSnapshots.
     * @example
     * // Create many CanvasSnapshots
     * const canvasSnapshot = await prisma.canvasSnapshot.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many CanvasSnapshots and only return the `fileId`
     * const canvasSnapshotWithFileIdOnly = await prisma.canvasSnapshot.createManyAndReturn({
     *   select: { fileId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends CanvasSnapshotCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a CanvasSnapshot.
     * @param {CanvasSnapshotDeleteArgs} args - Arguments to delete one CanvasSnapshot.
     * @example
     * // Delete one CanvasSnapshot
     * const CanvasSnapshot = await prisma.canvasSnapshot.delete({
     *   where: {
     *     // ... filter to delete one CanvasSnapshot
     *   }
     * })
     *
     */
    delete<T extends CanvasSnapshotDeleteArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotDeleteArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one CanvasSnapshot.
     * @param {CanvasSnapshotUpdateArgs} args - Arguments to update one CanvasSnapshot.
     * @example
     * // Update one CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends CanvasSnapshotUpdateArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotUpdateArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more CanvasSnapshots.
     * @param {CanvasSnapshotDeleteManyArgs} args - Arguments to filter CanvasSnapshots to delete.
     * @example
     * // Delete a few CanvasSnapshots
     * const { count } = await prisma.canvasSnapshot.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends CanvasSnapshotDeleteManyArgs>(args?: Prisma.SelectSubset<T, CanvasSnapshotDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more CanvasSnapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CanvasSnapshots
     * const canvasSnapshot = await prisma.canvasSnapshot.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends CanvasSnapshotUpdateManyArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more CanvasSnapshots and returns the data updated in the database.
     * @param {CanvasSnapshotUpdateManyAndReturnArgs} args - Arguments to update many CanvasSnapshots.
     * @example
     * // Update many CanvasSnapshots
     * const canvasSnapshot = await prisma.canvasSnapshot.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more CanvasSnapshots and only return the `fileId`
     * const canvasSnapshotWithFileIdOnly = await prisma.canvasSnapshot.updateManyAndReturn({
     *   select: { fileId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends CanvasSnapshotUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one CanvasSnapshot.
     * @param {CanvasSnapshotUpsertArgs} args - Arguments to update or create a CanvasSnapshot.
     * @example
     * // Update or create a CanvasSnapshot
     * const canvasSnapshot = await prisma.canvasSnapshot.upsert({
     *   create: {
     *     // ... data to create a CanvasSnapshot
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CanvasSnapshot we want to update
     *   }
     * })
     */
    upsert<T extends CanvasSnapshotUpsertArgs>(args: Prisma.SelectSubset<T, CanvasSnapshotUpsertArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of CanvasSnapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotCountArgs} args - Arguments to filter CanvasSnapshots to count.
     * @example
     * // Count the number of CanvasSnapshots
     * const count = await prisma.canvasSnapshot.count({
     *   where: {
     *     // ... the filter for the CanvasSnapshots we want to count
     *   }
     * })
    **/
    count<T extends CanvasSnapshotCountArgs>(args?: Prisma.Subset<T, CanvasSnapshotCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], CanvasSnapshotCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a CanvasSnapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CanvasSnapshotAggregateArgs>(args: Prisma.Subset<T, CanvasSnapshotAggregateArgs>): Prisma.PrismaPromise<GetCanvasSnapshotAggregateType<T>>;
    /**
     * Group by CanvasSnapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasSnapshotGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
    **/
    groupBy<T extends CanvasSnapshotGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: CanvasSnapshotGroupByArgs['orderBy'];
    } : {
        orderBy?: CanvasSnapshotGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, CanvasSnapshotGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCanvasSnapshotGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the CanvasSnapshot model
     */
    readonly fields: CanvasSnapshotFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for CanvasSnapshot.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__CanvasSnapshotClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    file<T extends Prisma.FileDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.FileDefaultArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
/**
 * Fields of the CanvasSnapshot model
 */
export interface CanvasSnapshotFieldRefs {
    readonly fileId: Prisma.FieldRef<"CanvasSnapshot", 'String'>;
    readonly elements: Prisma.FieldRef<"CanvasSnapshot", 'Json'>;
    readonly appState: Prisma.FieldRef<"CanvasSnapshot", 'Json'>;
    readonly elementCount: Prisma.FieldRef<"CanvasSnapshot", 'Int'>;
    readonly syncedAt: Prisma.FieldRef<"CanvasSnapshot", 'DateTime'>;
}
/**
 * CanvasSnapshot findUnique
 */
export type CanvasSnapshotFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter, which CanvasSnapshot to fetch.
     */
    where: Prisma.CanvasSnapshotWhereUniqueInput;
};
/**
 * CanvasSnapshot findUniqueOrThrow
 */
export type CanvasSnapshotFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter, which CanvasSnapshot to fetch.
     */
    where: Prisma.CanvasSnapshotWhereUniqueInput;
};
/**
 * CanvasSnapshot findFirst
 */
export type CanvasSnapshotFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter, which CanvasSnapshot to fetch.
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of CanvasSnapshots to fetch.
     */
    orderBy?: Prisma.CanvasSnapshotOrderByWithRelationInput | Prisma.CanvasSnapshotOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for CanvasSnapshots.
     */
    cursor?: Prisma.CanvasSnapshotWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` CanvasSnapshots from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` CanvasSnapshots.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of CanvasSnapshots.
     */
    distinct?: Prisma.CanvasSnapshotScalarFieldEnum | Prisma.CanvasSnapshotScalarFieldEnum[];
};
/**
 * CanvasSnapshot findFirstOrThrow
 */
export type CanvasSnapshotFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter, which CanvasSnapshot to fetch.
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of CanvasSnapshots to fetch.
     */
    orderBy?: Prisma.CanvasSnapshotOrderByWithRelationInput | Prisma.CanvasSnapshotOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for CanvasSnapshots.
     */
    cursor?: Prisma.CanvasSnapshotWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` CanvasSnapshots from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` CanvasSnapshots.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of CanvasSnapshots.
     */
    distinct?: Prisma.CanvasSnapshotScalarFieldEnum | Prisma.CanvasSnapshotScalarFieldEnum[];
};
/**
 * CanvasSnapshot findMany
 */
export type CanvasSnapshotFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter, which CanvasSnapshots to fetch.
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of CanvasSnapshots to fetch.
     */
    orderBy?: Prisma.CanvasSnapshotOrderByWithRelationInput | Prisma.CanvasSnapshotOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing CanvasSnapshots.
     */
    cursor?: Prisma.CanvasSnapshotWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` CanvasSnapshots from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` CanvasSnapshots.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of CanvasSnapshots.
     */
    distinct?: Prisma.CanvasSnapshotScalarFieldEnum | Prisma.CanvasSnapshotScalarFieldEnum[];
};
/**
 * CanvasSnapshot create
 */
export type CanvasSnapshotCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * The data needed to create a CanvasSnapshot.
     */
    data: Prisma.XOR<Prisma.CanvasSnapshotCreateInput, Prisma.CanvasSnapshotUncheckedCreateInput>;
};
/**
 * CanvasSnapshot createMany
 */
export type CanvasSnapshotCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many CanvasSnapshots.
     */
    data: Prisma.CanvasSnapshotCreateManyInput | Prisma.CanvasSnapshotCreateManyInput[];
    skipDuplicates?: boolean;
};
/**
 * CanvasSnapshot createManyAndReturn
 */
export type CanvasSnapshotCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * The data used to create many CanvasSnapshots.
     */
    data: Prisma.CanvasSnapshotCreateManyInput | Prisma.CanvasSnapshotCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * CanvasSnapshot update
 */
export type CanvasSnapshotUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * The data needed to update a CanvasSnapshot.
     */
    data: Prisma.XOR<Prisma.CanvasSnapshotUpdateInput, Prisma.CanvasSnapshotUncheckedUpdateInput>;
    /**
     * Choose, which CanvasSnapshot to update.
     */
    where: Prisma.CanvasSnapshotWhereUniqueInput;
};
/**
 * CanvasSnapshot updateMany
 */
export type CanvasSnapshotUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update CanvasSnapshots.
     */
    data: Prisma.XOR<Prisma.CanvasSnapshotUpdateManyMutationInput, Prisma.CanvasSnapshotUncheckedUpdateManyInput>;
    /**
     * Filter which CanvasSnapshots to update
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * Limit how many CanvasSnapshots to update.
     */
    limit?: number;
};
/**
 * CanvasSnapshot updateManyAndReturn
 */
export type CanvasSnapshotUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * The data used to update CanvasSnapshots.
     */
    data: Prisma.XOR<Prisma.CanvasSnapshotUpdateManyMutationInput, Prisma.CanvasSnapshotUncheckedUpdateManyInput>;
    /**
     * Filter which CanvasSnapshots to update
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * Limit how many CanvasSnapshots to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * CanvasSnapshot upsert
 */
export type CanvasSnapshotUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * The filter to search for the CanvasSnapshot to update in case it exists.
     */
    where: Prisma.CanvasSnapshotWhereUniqueInput;
    /**
     * In case the CanvasSnapshot found by the `where` argument doesn't exist, create a new CanvasSnapshot with this data.
     */
    create: Prisma.XOR<Prisma.CanvasSnapshotCreateInput, Prisma.CanvasSnapshotUncheckedCreateInput>;
    /**
     * In case the CanvasSnapshot was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.CanvasSnapshotUpdateInput, Prisma.CanvasSnapshotUncheckedUpdateInput>;
};
/**
 * CanvasSnapshot delete
 */
export type CanvasSnapshotDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
    /**
     * Filter which CanvasSnapshot to delete.
     */
    where: Prisma.CanvasSnapshotWhereUniqueInput;
};
/**
 * CanvasSnapshot deleteMany
 */
export type CanvasSnapshotDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which CanvasSnapshots to delete
     */
    where?: Prisma.CanvasSnapshotWhereInput;
    /**
     * Limit how many CanvasSnapshots to delete.
     */
    limit?: number;
};
/**
 * CanvasSnapshot without action
 */
export type CanvasSnapshotDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasSnapshot
     */
    select?: Prisma.CanvasSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the CanvasSnapshot
     */
    omit?: Prisma.CanvasSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.CanvasSnapshotInclude<ExtArgs> | null;
};
//# sourceMappingURL=CanvasSnapshot.d.ts.map