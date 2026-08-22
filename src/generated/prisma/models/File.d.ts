import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace";
/**
 * Model File
 *
 */
export type FileModel = runtime.Types.Result.DefaultSelection<Prisma.$FilePayload>;
export type AggregateFile = {
    _count: FileCountAggregateOutputType | null;
    _min: FileMinAggregateOutputType | null;
    _max: FileMaxAggregateOutputType | null;
};
export type FileMinAggregateOutputType = {
    id: string | null;
    projectId: string | null;
    folderId: string | null;
    name: string | null;
    normalizedName: string | null;
    directoryKey: string | null;
    type: string | null;
    roomId: string | null;
    createdById: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type FileMaxAggregateOutputType = {
    id: string | null;
    projectId: string | null;
    folderId: string | null;
    name: string | null;
    normalizedName: string | null;
    directoryKey: string | null;
    type: string | null;
    roomId: string | null;
    createdById: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type FileCountAggregateOutputType = {
    id: number;
    projectId: number;
    folderId: number;
    name: number;
    normalizedName: number;
    directoryKey: number;
    type: number;
    roomId: number;
    createdById: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type FileMinAggregateInputType = {
    id?: true;
    projectId?: true;
    folderId?: true;
    name?: true;
    normalizedName?: true;
    directoryKey?: true;
    type?: true;
    roomId?: true;
    createdById?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type FileMaxAggregateInputType = {
    id?: true;
    projectId?: true;
    folderId?: true;
    name?: true;
    normalizedName?: true;
    directoryKey?: true;
    type?: true;
    roomId?: true;
    createdById?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type FileCountAggregateInputType = {
    id?: true;
    projectId?: true;
    folderId?: true;
    name?: true;
    normalizedName?: true;
    directoryKey?: true;
    type?: true;
    roomId?: true;
    createdById?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type FileAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which File to aggregate.
     */
    where?: Prisma.FileWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Files to fetch.
     */
    orderBy?: Prisma.FileOrderByWithRelationInput | Prisma.FileOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.FileWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Files from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Files.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Files
    **/
    _count?: true | FileCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: FileMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: FileMaxAggregateInputType;
};
export type GetFileAggregateType<T extends FileAggregateArgs> = {
    [P in keyof T & keyof AggregateFile]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateFile[P]> : Prisma.GetScalarType<T[P], AggregateFile[P]>;
};
export type FileGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.FileWhereInput;
    orderBy?: Prisma.FileOrderByWithAggregationInput | Prisma.FileOrderByWithAggregationInput[];
    by: Prisma.FileScalarFieldEnum[] | Prisma.FileScalarFieldEnum;
    having?: Prisma.FileScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: FileCountAggregateInputType | true;
    _min?: FileMinAggregateInputType;
    _max?: FileMaxAggregateInputType;
};
export type FileGroupByOutputType = {
    id: string;
    projectId: string;
    folderId: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    _count: FileCountAggregateOutputType | null;
    _min: FileMinAggregateOutputType | null;
    _max: FileMaxAggregateOutputType | null;
};
export type GetFileGroupByPayload<T extends FileGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<FileGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof FileGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], FileGroupByOutputType[P]> : Prisma.GetScalarType<T[P], FileGroupByOutputType[P]>;
}>>;
export type FileWhereInput = {
    AND?: Prisma.FileWhereInput | Prisma.FileWhereInput[];
    OR?: Prisma.FileWhereInput[];
    NOT?: Prisma.FileWhereInput | Prisma.FileWhereInput[];
    id?: Prisma.StringFilter<"File"> | string;
    projectId?: Prisma.StringFilter<"File"> | string;
    folderId?: Prisma.StringNullableFilter<"File"> | string | null;
    name?: Prisma.StringFilter<"File"> | string;
    normalizedName?: Prisma.StringFilter<"File"> | string;
    directoryKey?: Prisma.StringFilter<"File"> | string;
    type?: Prisma.StringFilter<"File"> | string;
    roomId?: Prisma.StringNullableFilter<"File"> | string | null;
    createdById?: Prisma.StringFilter<"File"> | string;
    createdAt?: Prisma.DateTimeFilter<"File"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"File"> | Date | string;
    project?: Prisma.XOR<Prisma.ProjectScalarRelationFilter, Prisma.ProjectWhereInput>;
    folder?: Prisma.XOR<Prisma.FolderNullableScalarRelationFilter, Prisma.FolderWhereInput> | null;
    canvas?: Prisma.XOR<Prisma.CanvasSnapshotNullableScalarRelationFilter, Prisma.CanvasSnapshotWhereInput> | null;
    document?: Prisma.XOR<Prisma.DocumentSnapshotNullableScalarRelationFilter, Prisma.DocumentSnapshotWhereInput> | null;
};
export type FileOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    folderId?: Prisma.SortOrderInput | Prisma.SortOrder;
    name?: Prisma.SortOrder;
    normalizedName?: Prisma.SortOrder;
    directoryKey?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    roomId?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdById?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    project?: Prisma.ProjectOrderByWithRelationInput;
    folder?: Prisma.FolderOrderByWithRelationInput;
    canvas?: Prisma.CanvasSnapshotOrderByWithRelationInput;
    document?: Prisma.DocumentSnapshotOrderByWithRelationInput;
};
export type FileWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    roomId?: string;
    directoryKey_normalizedName?: Prisma.FileDirectoryKeyNormalizedNameCompoundUniqueInput;
    AND?: Prisma.FileWhereInput | Prisma.FileWhereInput[];
    OR?: Prisma.FileWhereInput[];
    NOT?: Prisma.FileWhereInput | Prisma.FileWhereInput[];
    projectId?: Prisma.StringFilter<"File"> | string;
    folderId?: Prisma.StringNullableFilter<"File"> | string | null;
    name?: Prisma.StringFilter<"File"> | string;
    normalizedName?: Prisma.StringFilter<"File"> | string;
    directoryKey?: Prisma.StringFilter<"File"> | string;
    type?: Prisma.StringFilter<"File"> | string;
    createdById?: Prisma.StringFilter<"File"> | string;
    createdAt?: Prisma.DateTimeFilter<"File"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"File"> | Date | string;
    project?: Prisma.XOR<Prisma.ProjectScalarRelationFilter, Prisma.ProjectWhereInput>;
    folder?: Prisma.XOR<Prisma.FolderNullableScalarRelationFilter, Prisma.FolderWhereInput> | null;
    canvas?: Prisma.XOR<Prisma.CanvasSnapshotNullableScalarRelationFilter, Prisma.CanvasSnapshotWhereInput> | null;
    document?: Prisma.XOR<Prisma.DocumentSnapshotNullableScalarRelationFilter, Prisma.DocumentSnapshotWhereInput> | null;
}, "id" | "roomId" | "directoryKey_normalizedName">;
export type FileOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    folderId?: Prisma.SortOrderInput | Prisma.SortOrder;
    name?: Prisma.SortOrder;
    normalizedName?: Prisma.SortOrder;
    directoryKey?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    roomId?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdById?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.FileCountOrderByAggregateInput;
    _max?: Prisma.FileMaxOrderByAggregateInput;
    _min?: Prisma.FileMinOrderByAggregateInput;
};
export type FileScalarWhereWithAggregatesInput = {
    AND?: Prisma.FileScalarWhereWithAggregatesInput | Prisma.FileScalarWhereWithAggregatesInput[];
    OR?: Prisma.FileScalarWhereWithAggregatesInput[];
    NOT?: Prisma.FileScalarWhereWithAggregatesInput | Prisma.FileScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"File"> | string;
    projectId?: Prisma.StringWithAggregatesFilter<"File"> | string;
    folderId?: Prisma.StringNullableWithAggregatesFilter<"File"> | string | null;
    name?: Prisma.StringWithAggregatesFilter<"File"> | string;
    normalizedName?: Prisma.StringWithAggregatesFilter<"File"> | string;
    directoryKey?: Prisma.StringWithAggregatesFilter<"File"> | string;
    type?: Prisma.StringWithAggregatesFilter<"File"> | string;
    roomId?: Prisma.StringNullableWithAggregatesFilter<"File"> | string | null;
    createdById?: Prisma.StringWithAggregatesFilter<"File"> | string;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"File"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"File"> | Date | string;
};
export type FileCreateInput = {
    id?: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    project: Prisma.ProjectCreateNestedOneWithoutFilesInput;
    folder?: Prisma.FolderCreateNestedOneWithoutFilesInput;
    canvas?: Prisma.CanvasSnapshotCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotCreateNestedOneWithoutFileInput;
};
export type FileUncheckedCreateInput = {
    id?: string;
    projectId: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotUncheckedCreateNestedOneWithoutFileInput;
};
export type FileUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    project?: Prisma.ProjectUpdateOneRequiredWithoutFilesNestedInput;
    folder?: Prisma.FolderUpdateOneWithoutFilesNestedInput;
    canvas?: Prisma.CanvasSnapshotUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUncheckedUpdateOneWithoutFileNestedInput;
};
export type FileCreateManyInput = {
    id?: string;
    projectId: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type FileUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type FileUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type FileListRelationFilter = {
    every?: Prisma.FileWhereInput;
    some?: Prisma.FileWhereInput;
    none?: Prisma.FileWhereInput;
};
export type FileOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type FileDirectoryKeyNormalizedNameCompoundUniqueInput = {
    directoryKey: string;
    normalizedName: string;
};
export type FileCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    folderId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    normalizedName?: Prisma.SortOrder;
    directoryKey?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    roomId?: Prisma.SortOrder;
    createdById?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type FileMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    folderId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    normalizedName?: Prisma.SortOrder;
    directoryKey?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    roomId?: Prisma.SortOrder;
    createdById?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type FileMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    folderId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    normalizedName?: Prisma.SortOrder;
    directoryKey?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    roomId?: Prisma.SortOrder;
    createdById?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type FileScalarRelationFilter = {
    is?: Prisma.FileWhereInput;
    isNot?: Prisma.FileWhereInput;
};
export type FileCreateNestedManyWithoutProjectInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput> | Prisma.FileCreateWithoutProjectInput[] | Prisma.FileUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutProjectInput | Prisma.FileCreateOrConnectWithoutProjectInput[];
    createMany?: Prisma.FileCreateManyProjectInputEnvelope;
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
};
export type FileUncheckedCreateNestedManyWithoutProjectInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput> | Prisma.FileCreateWithoutProjectInput[] | Prisma.FileUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutProjectInput | Prisma.FileCreateOrConnectWithoutProjectInput[];
    createMany?: Prisma.FileCreateManyProjectInputEnvelope;
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
};
export type FileUpdateManyWithoutProjectNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput> | Prisma.FileCreateWithoutProjectInput[] | Prisma.FileUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutProjectInput | Prisma.FileCreateOrConnectWithoutProjectInput[];
    upsert?: Prisma.FileUpsertWithWhereUniqueWithoutProjectInput | Prisma.FileUpsertWithWhereUniqueWithoutProjectInput[];
    createMany?: Prisma.FileCreateManyProjectInputEnvelope;
    set?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    disconnect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    delete?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    update?: Prisma.FileUpdateWithWhereUniqueWithoutProjectInput | Prisma.FileUpdateWithWhereUniqueWithoutProjectInput[];
    updateMany?: Prisma.FileUpdateManyWithWhereWithoutProjectInput | Prisma.FileUpdateManyWithWhereWithoutProjectInput[];
    deleteMany?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
};
export type FileUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput> | Prisma.FileCreateWithoutProjectInput[] | Prisma.FileUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutProjectInput | Prisma.FileCreateOrConnectWithoutProjectInput[];
    upsert?: Prisma.FileUpsertWithWhereUniqueWithoutProjectInput | Prisma.FileUpsertWithWhereUniqueWithoutProjectInput[];
    createMany?: Prisma.FileCreateManyProjectInputEnvelope;
    set?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    disconnect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    delete?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    update?: Prisma.FileUpdateWithWhereUniqueWithoutProjectInput | Prisma.FileUpdateWithWhereUniqueWithoutProjectInput[];
    updateMany?: Prisma.FileUpdateManyWithWhereWithoutProjectInput | Prisma.FileUpdateManyWithWhereWithoutProjectInput[];
    deleteMany?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
};
export type FileCreateNestedManyWithoutFolderInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput> | Prisma.FileCreateWithoutFolderInput[] | Prisma.FileUncheckedCreateWithoutFolderInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutFolderInput | Prisma.FileCreateOrConnectWithoutFolderInput[];
    createMany?: Prisma.FileCreateManyFolderInputEnvelope;
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
};
export type FileUncheckedCreateNestedManyWithoutFolderInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput> | Prisma.FileCreateWithoutFolderInput[] | Prisma.FileUncheckedCreateWithoutFolderInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutFolderInput | Prisma.FileCreateOrConnectWithoutFolderInput[];
    createMany?: Prisma.FileCreateManyFolderInputEnvelope;
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
};
export type FileUpdateManyWithoutFolderNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput> | Prisma.FileCreateWithoutFolderInput[] | Prisma.FileUncheckedCreateWithoutFolderInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutFolderInput | Prisma.FileCreateOrConnectWithoutFolderInput[];
    upsert?: Prisma.FileUpsertWithWhereUniqueWithoutFolderInput | Prisma.FileUpsertWithWhereUniqueWithoutFolderInput[];
    createMany?: Prisma.FileCreateManyFolderInputEnvelope;
    set?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    disconnect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    delete?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    update?: Prisma.FileUpdateWithWhereUniqueWithoutFolderInput | Prisma.FileUpdateWithWhereUniqueWithoutFolderInput[];
    updateMany?: Prisma.FileUpdateManyWithWhereWithoutFolderInput | Prisma.FileUpdateManyWithWhereWithoutFolderInput[];
    deleteMany?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
};
export type FileUncheckedUpdateManyWithoutFolderNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput> | Prisma.FileCreateWithoutFolderInput[] | Prisma.FileUncheckedCreateWithoutFolderInput[];
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutFolderInput | Prisma.FileCreateOrConnectWithoutFolderInput[];
    upsert?: Prisma.FileUpsertWithWhereUniqueWithoutFolderInput | Prisma.FileUpsertWithWhereUniqueWithoutFolderInput[];
    createMany?: Prisma.FileCreateManyFolderInputEnvelope;
    set?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    disconnect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    delete?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    connect?: Prisma.FileWhereUniqueInput | Prisma.FileWhereUniqueInput[];
    update?: Prisma.FileUpdateWithWhereUniqueWithoutFolderInput | Prisma.FileUpdateWithWhereUniqueWithoutFolderInput[];
    updateMany?: Prisma.FileUpdateManyWithWhereWithoutFolderInput | Prisma.FileUpdateManyWithWhereWithoutFolderInput[];
    deleteMany?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
};
export type FileCreateNestedOneWithoutCanvasInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutCanvasInput, Prisma.FileUncheckedCreateWithoutCanvasInput>;
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutCanvasInput;
    connect?: Prisma.FileWhereUniqueInput;
};
export type FileUpdateOneRequiredWithoutCanvasNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutCanvasInput, Prisma.FileUncheckedCreateWithoutCanvasInput>;
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutCanvasInput;
    upsert?: Prisma.FileUpsertWithoutCanvasInput;
    connect?: Prisma.FileWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.FileUpdateToOneWithWhereWithoutCanvasInput, Prisma.FileUpdateWithoutCanvasInput>, Prisma.FileUncheckedUpdateWithoutCanvasInput>;
};
export type FileCreateNestedOneWithoutDocumentInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutDocumentInput, Prisma.FileUncheckedCreateWithoutDocumentInput>;
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutDocumentInput;
    connect?: Prisma.FileWhereUniqueInput;
};
export type FileUpdateOneRequiredWithoutDocumentNestedInput = {
    create?: Prisma.XOR<Prisma.FileCreateWithoutDocumentInput, Prisma.FileUncheckedCreateWithoutDocumentInput>;
    connectOrCreate?: Prisma.FileCreateOrConnectWithoutDocumentInput;
    upsert?: Prisma.FileUpsertWithoutDocumentInput;
    connect?: Prisma.FileWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.FileUpdateToOneWithWhereWithoutDocumentInput, Prisma.FileUpdateWithoutDocumentInput>, Prisma.FileUncheckedUpdateWithoutDocumentInput>;
};
export type FileCreateWithoutProjectInput = {
    id?: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    folder?: Prisma.FolderCreateNestedOneWithoutFilesInput;
    canvas?: Prisma.CanvasSnapshotCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotCreateNestedOneWithoutFileInput;
};
export type FileUncheckedCreateWithoutProjectInput = {
    id?: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotUncheckedCreateNestedOneWithoutFileInput;
};
export type FileCreateOrConnectWithoutProjectInput = {
    where: Prisma.FileWhereUniqueInput;
    create: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput>;
};
export type FileCreateManyProjectInputEnvelope = {
    data: Prisma.FileCreateManyProjectInput | Prisma.FileCreateManyProjectInput[];
    skipDuplicates?: boolean;
};
export type FileUpsertWithWhereUniqueWithoutProjectInput = {
    where: Prisma.FileWhereUniqueInput;
    update: Prisma.XOR<Prisma.FileUpdateWithoutProjectInput, Prisma.FileUncheckedUpdateWithoutProjectInput>;
    create: Prisma.XOR<Prisma.FileCreateWithoutProjectInput, Prisma.FileUncheckedCreateWithoutProjectInput>;
};
export type FileUpdateWithWhereUniqueWithoutProjectInput = {
    where: Prisma.FileWhereUniqueInput;
    data: Prisma.XOR<Prisma.FileUpdateWithoutProjectInput, Prisma.FileUncheckedUpdateWithoutProjectInput>;
};
export type FileUpdateManyWithWhereWithoutProjectInput = {
    where: Prisma.FileScalarWhereInput;
    data: Prisma.XOR<Prisma.FileUpdateManyMutationInput, Prisma.FileUncheckedUpdateManyWithoutProjectInput>;
};
export type FileScalarWhereInput = {
    AND?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
    OR?: Prisma.FileScalarWhereInput[];
    NOT?: Prisma.FileScalarWhereInput | Prisma.FileScalarWhereInput[];
    id?: Prisma.StringFilter<"File"> | string;
    projectId?: Prisma.StringFilter<"File"> | string;
    folderId?: Prisma.StringNullableFilter<"File"> | string | null;
    name?: Prisma.StringFilter<"File"> | string;
    normalizedName?: Prisma.StringFilter<"File"> | string;
    directoryKey?: Prisma.StringFilter<"File"> | string;
    type?: Prisma.StringFilter<"File"> | string;
    roomId?: Prisma.StringNullableFilter<"File"> | string | null;
    createdById?: Prisma.StringFilter<"File"> | string;
    createdAt?: Prisma.DateTimeFilter<"File"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"File"> | Date | string;
};
export type FileCreateWithoutFolderInput = {
    id?: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    project: Prisma.ProjectCreateNestedOneWithoutFilesInput;
    canvas?: Prisma.CanvasSnapshotCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotCreateNestedOneWithoutFileInput;
};
export type FileUncheckedCreateWithoutFolderInput = {
    id?: string;
    projectId: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedCreateNestedOneWithoutFileInput;
    document?: Prisma.DocumentSnapshotUncheckedCreateNestedOneWithoutFileInput;
};
export type FileCreateOrConnectWithoutFolderInput = {
    where: Prisma.FileWhereUniqueInput;
    create: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput>;
};
export type FileCreateManyFolderInputEnvelope = {
    data: Prisma.FileCreateManyFolderInput | Prisma.FileCreateManyFolderInput[];
    skipDuplicates?: boolean;
};
export type FileUpsertWithWhereUniqueWithoutFolderInput = {
    where: Prisma.FileWhereUniqueInput;
    update: Prisma.XOR<Prisma.FileUpdateWithoutFolderInput, Prisma.FileUncheckedUpdateWithoutFolderInput>;
    create: Prisma.XOR<Prisma.FileCreateWithoutFolderInput, Prisma.FileUncheckedCreateWithoutFolderInput>;
};
export type FileUpdateWithWhereUniqueWithoutFolderInput = {
    where: Prisma.FileWhereUniqueInput;
    data: Prisma.XOR<Prisma.FileUpdateWithoutFolderInput, Prisma.FileUncheckedUpdateWithoutFolderInput>;
};
export type FileUpdateManyWithWhereWithoutFolderInput = {
    where: Prisma.FileScalarWhereInput;
    data: Prisma.XOR<Prisma.FileUpdateManyMutationInput, Prisma.FileUncheckedUpdateManyWithoutFolderInput>;
};
export type FileCreateWithoutCanvasInput = {
    id?: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    project: Prisma.ProjectCreateNestedOneWithoutFilesInput;
    folder?: Prisma.FolderCreateNestedOneWithoutFilesInput;
    document?: Prisma.DocumentSnapshotCreateNestedOneWithoutFileInput;
};
export type FileUncheckedCreateWithoutCanvasInput = {
    id?: string;
    projectId: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    document?: Prisma.DocumentSnapshotUncheckedCreateNestedOneWithoutFileInput;
};
export type FileCreateOrConnectWithoutCanvasInput = {
    where: Prisma.FileWhereUniqueInput;
    create: Prisma.XOR<Prisma.FileCreateWithoutCanvasInput, Prisma.FileUncheckedCreateWithoutCanvasInput>;
};
export type FileUpsertWithoutCanvasInput = {
    update: Prisma.XOR<Prisma.FileUpdateWithoutCanvasInput, Prisma.FileUncheckedUpdateWithoutCanvasInput>;
    create: Prisma.XOR<Prisma.FileCreateWithoutCanvasInput, Prisma.FileUncheckedCreateWithoutCanvasInput>;
    where?: Prisma.FileWhereInput;
};
export type FileUpdateToOneWithWhereWithoutCanvasInput = {
    where?: Prisma.FileWhereInput;
    data: Prisma.XOR<Prisma.FileUpdateWithoutCanvasInput, Prisma.FileUncheckedUpdateWithoutCanvasInput>;
};
export type FileUpdateWithoutCanvasInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    project?: Prisma.ProjectUpdateOneRequiredWithoutFilesNestedInput;
    folder?: Prisma.FolderUpdateOneWithoutFilesNestedInput;
    document?: Prisma.DocumentSnapshotUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateWithoutCanvasInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    document?: Prisma.DocumentSnapshotUncheckedUpdateOneWithoutFileNestedInput;
};
export type FileCreateWithoutDocumentInput = {
    id?: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    project: Prisma.ProjectCreateNestedOneWithoutFilesInput;
    folder?: Prisma.FolderCreateNestedOneWithoutFilesInput;
    canvas?: Prisma.CanvasSnapshotCreateNestedOneWithoutFileInput;
};
export type FileUncheckedCreateWithoutDocumentInput = {
    id?: string;
    projectId: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedCreateNestedOneWithoutFileInput;
};
export type FileCreateOrConnectWithoutDocumentInput = {
    where: Prisma.FileWhereUniqueInput;
    create: Prisma.XOR<Prisma.FileCreateWithoutDocumentInput, Prisma.FileUncheckedCreateWithoutDocumentInput>;
};
export type FileUpsertWithoutDocumentInput = {
    update: Prisma.XOR<Prisma.FileUpdateWithoutDocumentInput, Prisma.FileUncheckedUpdateWithoutDocumentInput>;
    create: Prisma.XOR<Prisma.FileCreateWithoutDocumentInput, Prisma.FileUncheckedCreateWithoutDocumentInput>;
    where?: Prisma.FileWhereInput;
};
export type FileUpdateToOneWithWhereWithoutDocumentInput = {
    where?: Prisma.FileWhereInput;
    data: Prisma.XOR<Prisma.FileUpdateWithoutDocumentInput, Prisma.FileUncheckedUpdateWithoutDocumentInput>;
};
export type FileUpdateWithoutDocumentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    project?: Prisma.ProjectUpdateOneRequiredWithoutFilesNestedInput;
    folder?: Prisma.FolderUpdateOneWithoutFilesNestedInput;
    canvas?: Prisma.CanvasSnapshotUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateWithoutDocumentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedUpdateOneWithoutFileNestedInput;
};
export type FileCreateManyProjectInput = {
    id?: string;
    folderId?: string | null;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type FileUpdateWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    folder?: Prisma.FolderUpdateOneWithoutFilesNestedInput;
    canvas?: Prisma.CanvasSnapshotUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUncheckedUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateManyWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    folderId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type FileCreateManyFolderInput = {
    id?: string;
    projectId: string;
    name: string;
    normalizedName: string;
    directoryKey: string;
    type: string;
    roomId?: string | null;
    createdById: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type FileUpdateWithoutFolderInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    project?: Prisma.ProjectUpdateOneRequiredWithoutFilesNestedInput;
    canvas?: Prisma.CanvasSnapshotUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateWithoutFolderInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    canvas?: Prisma.CanvasSnapshotUncheckedUpdateOneWithoutFileNestedInput;
    document?: Prisma.DocumentSnapshotUncheckedUpdateOneWithoutFileNestedInput;
};
export type FileUncheckedUpdateManyWithoutFolderInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    normalizedName?: Prisma.StringFieldUpdateOperationsInput | string;
    directoryKey?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    roomId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdById?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type FileSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    projectId?: boolean;
    folderId?: boolean;
    name?: boolean;
    normalizedName?: boolean;
    directoryKey?: boolean;
    type?: boolean;
    roomId?: boolean;
    createdById?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
    canvas?: boolean | Prisma.File$canvasArgs<ExtArgs>;
    document?: boolean | Prisma.File$documentArgs<ExtArgs>;
}, ExtArgs["result"]["file"]>;
export type FileSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    projectId?: boolean;
    folderId?: boolean;
    name?: boolean;
    normalizedName?: boolean;
    directoryKey?: boolean;
    type?: boolean;
    roomId?: boolean;
    createdById?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
}, ExtArgs["result"]["file"]>;
export type FileSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    projectId?: boolean;
    folderId?: boolean;
    name?: boolean;
    normalizedName?: boolean;
    directoryKey?: boolean;
    type?: boolean;
    roomId?: boolean;
    createdById?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
}, ExtArgs["result"]["file"]>;
export type FileSelectScalar = {
    id?: boolean;
    projectId?: boolean;
    folderId?: boolean;
    name?: boolean;
    normalizedName?: boolean;
    directoryKey?: boolean;
    type?: boolean;
    roomId?: boolean;
    createdById?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type FileOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "projectId" | "folderId" | "name" | "normalizedName" | "directoryKey" | "type" | "roomId" | "createdById" | "createdAt" | "updatedAt", ExtArgs["result"]["file"]>;
export type FileInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
    canvas?: boolean | Prisma.File$canvasArgs<ExtArgs>;
    document?: boolean | Prisma.File$documentArgs<ExtArgs>;
};
export type FileIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
};
export type FileIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
    folder?: boolean | Prisma.File$folderArgs<ExtArgs>;
};
export type $FilePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "File";
    objects: {
        project: Prisma.$ProjectPayload<ExtArgs>;
        folder: Prisma.$FolderPayload<ExtArgs> | null;
        canvas: Prisma.$CanvasSnapshotPayload<ExtArgs> | null;
        document: Prisma.$DocumentSnapshotPayload<ExtArgs> | null;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        projectId: string;
        folderId: string | null;
        name: string;
        normalizedName: string;
        directoryKey: string;
        type: string;
        roomId: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["file"]>;
    composites: {};
};
export type FileGetPayload<S extends boolean | null | undefined | FileDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$FilePayload, S>;
export type FileCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<FileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: FileCountAggregateInputType | true;
};
export interface FileDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['File'];
        meta: {
            name: 'File';
        };
    };
    /**
     * Find zero or one File that matches the filter.
     * @param {FileFindUniqueArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FileFindUniqueArgs>(args: Prisma.SelectSubset<T, FileFindUniqueArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one File that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FileFindUniqueOrThrowArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FileFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, FileFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first File that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindFirstArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FileFindFirstArgs>(args?: Prisma.SelectSubset<T, FileFindFirstArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first File that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindFirstOrThrowArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FileFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, FileFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more Files that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Files
     * const files = await prisma.file.findMany()
     *
     * // Get first 10 Files
     * const files = await prisma.file.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const fileWithIdOnly = await prisma.file.findMany({ select: { id: true } })
     *
     */
    findMany<T extends FileFindManyArgs>(args?: Prisma.SelectSubset<T, FileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a File.
     * @param {FileCreateArgs} args - Arguments to create a File.
     * @example
     * // Create one File
     * const File = await prisma.file.create({
     *   data: {
     *     // ... data to create a File
     *   }
     * })
     *
     */
    create<T extends FileCreateArgs>(args: Prisma.SelectSubset<T, FileCreateArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many Files.
     * @param {FileCreateManyArgs} args - Arguments to create many Files.
     * @example
     * // Create many Files
     * const file = await prisma.file.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends FileCreateManyArgs>(args?: Prisma.SelectSubset<T, FileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many Files and returns the data saved in the database.
     * @param {FileCreateManyAndReturnArgs} args - Arguments to create many Files.
     * @example
     * // Create many Files
     * const file = await prisma.file.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Files and only return the `id`
     * const fileWithIdOnly = await prisma.file.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends FileCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, FileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a File.
     * @param {FileDeleteArgs} args - Arguments to delete one File.
     * @example
     * // Delete one File
     * const File = await prisma.file.delete({
     *   where: {
     *     // ... filter to delete one File
     *   }
     * })
     *
     */
    delete<T extends FileDeleteArgs>(args: Prisma.SelectSubset<T, FileDeleteArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one File.
     * @param {FileUpdateArgs} args - Arguments to update one File.
     * @example
     * // Update one File
     * const file = await prisma.file.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends FileUpdateArgs>(args: Prisma.SelectSubset<T, FileUpdateArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more Files.
     * @param {FileDeleteManyArgs} args - Arguments to filter Files to delete.
     * @example
     * // Delete a few Files
     * const { count } = await prisma.file.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends FileDeleteManyArgs>(args?: Prisma.SelectSubset<T, FileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Files.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Files
     * const file = await prisma.file.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends FileUpdateManyArgs>(args: Prisma.SelectSubset<T, FileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Files and returns the data updated in the database.
     * @param {FileUpdateManyAndReturnArgs} args - Arguments to update many Files.
     * @example
     * // Update many Files
     * const file = await prisma.file.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more Files and only return the `id`
     * const fileWithIdOnly = await prisma.file.updateManyAndReturn({
     *   select: { id: true },
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
    updateManyAndReturn<T extends FileUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, FileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one File.
     * @param {FileUpsertArgs} args - Arguments to update or create a File.
     * @example
     * // Update or create a File
     * const file = await prisma.file.upsert({
     *   create: {
     *     // ... data to create a File
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the File we want to update
     *   }
     * })
     */
    upsert<T extends FileUpsertArgs>(args: Prisma.SelectSubset<T, FileUpsertArgs<ExtArgs>>): Prisma.Prisma__FileClient<runtime.Types.Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of Files.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileCountArgs} args - Arguments to filter Files to count.
     * @example
     * // Count the number of Files
     * const count = await prisma.file.count({
     *   where: {
     *     // ... the filter for the Files we want to count
     *   }
     * })
    **/
    count<T extends FileCountArgs>(args?: Prisma.Subset<T, FileCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], FileCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a File.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends FileAggregateArgs>(args: Prisma.Subset<T, FileAggregateArgs>): Prisma.PrismaPromise<GetFileAggregateType<T>>;
    /**
     * Group by File.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileGroupByArgs} args - Group by arguments.
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
    groupBy<T extends FileGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: FileGroupByArgs['orderBy'];
    } : {
        orderBy?: FileGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, FileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the File model
     */
    readonly fields: FileFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for File.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__FileClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    project<T extends Prisma.ProjectDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.ProjectDefaultArgs<ExtArgs>>): Prisma.Prisma__ProjectClient<runtime.Types.Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    folder<T extends Prisma.File$folderArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.File$folderArgs<ExtArgs>>): Prisma.Prisma__FolderClient<runtime.Types.Result.GetResult<Prisma.$FolderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    canvas<T extends Prisma.File$canvasArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.File$canvasArgs<ExtArgs>>): Prisma.Prisma__CanvasSnapshotClient<runtime.Types.Result.GetResult<Prisma.$CanvasSnapshotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    document<T extends Prisma.File$documentArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.File$documentArgs<ExtArgs>>): Prisma.Prisma__DocumentSnapshotClient<runtime.Types.Result.GetResult<Prisma.$DocumentSnapshotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
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
 * Fields of the File model
 */
export interface FileFieldRefs {
    readonly id: Prisma.FieldRef<"File", 'String'>;
    readonly projectId: Prisma.FieldRef<"File", 'String'>;
    readonly folderId: Prisma.FieldRef<"File", 'String'>;
    readonly name: Prisma.FieldRef<"File", 'String'>;
    readonly normalizedName: Prisma.FieldRef<"File", 'String'>;
    readonly directoryKey: Prisma.FieldRef<"File", 'String'>;
    readonly type: Prisma.FieldRef<"File", 'String'>;
    readonly roomId: Prisma.FieldRef<"File", 'String'>;
    readonly createdById: Prisma.FieldRef<"File", 'String'>;
    readonly createdAt: Prisma.FieldRef<"File", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"File", 'DateTime'>;
}
/**
 * File findUnique
 */
export type FileFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter, which File to fetch.
     */
    where: Prisma.FileWhereUniqueInput;
};
/**
 * File findUniqueOrThrow
 */
export type FileFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter, which File to fetch.
     */
    where: Prisma.FileWhereUniqueInput;
};
/**
 * File findFirst
 */
export type FileFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter, which File to fetch.
     */
    where?: Prisma.FileWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Files to fetch.
     */
    orderBy?: Prisma.FileOrderByWithRelationInput | Prisma.FileOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Files.
     */
    cursor?: Prisma.FileWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Files from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Files.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Files.
     */
    distinct?: Prisma.FileScalarFieldEnum | Prisma.FileScalarFieldEnum[];
};
/**
 * File findFirstOrThrow
 */
export type FileFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter, which File to fetch.
     */
    where?: Prisma.FileWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Files to fetch.
     */
    orderBy?: Prisma.FileOrderByWithRelationInput | Prisma.FileOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Files.
     */
    cursor?: Prisma.FileWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Files from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Files.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Files.
     */
    distinct?: Prisma.FileScalarFieldEnum | Prisma.FileScalarFieldEnum[];
};
/**
 * File findMany
 */
export type FileFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter, which Files to fetch.
     */
    where?: Prisma.FileWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Files to fetch.
     */
    orderBy?: Prisma.FileOrderByWithRelationInput | Prisma.FileOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Files.
     */
    cursor?: Prisma.FileWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Files from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Files.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Files.
     */
    distinct?: Prisma.FileScalarFieldEnum | Prisma.FileScalarFieldEnum[];
};
/**
 * File create
 */
export type FileCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * The data needed to create a File.
     */
    data: Prisma.XOR<Prisma.FileCreateInput, Prisma.FileUncheckedCreateInput>;
};
/**
 * File createMany
 */
export type FileCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Files.
     */
    data: Prisma.FileCreateManyInput | Prisma.FileCreateManyInput[];
    skipDuplicates?: boolean;
};
/**
 * File createManyAndReturn
 */
export type FileCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * The data used to create many Files.
     */
    data: Prisma.FileCreateManyInput | Prisma.FileCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * File update
 */
export type FileUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * The data needed to update a File.
     */
    data: Prisma.XOR<Prisma.FileUpdateInput, Prisma.FileUncheckedUpdateInput>;
    /**
     * Choose, which File to update.
     */
    where: Prisma.FileWhereUniqueInput;
};
/**
 * File updateMany
 */
export type FileUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Files.
     */
    data: Prisma.XOR<Prisma.FileUpdateManyMutationInput, Prisma.FileUncheckedUpdateManyInput>;
    /**
     * Filter which Files to update
     */
    where?: Prisma.FileWhereInput;
    /**
     * Limit how many Files to update.
     */
    limit?: number;
};
/**
 * File updateManyAndReturn
 */
export type FileUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * The data used to update Files.
     */
    data: Prisma.XOR<Prisma.FileUpdateManyMutationInput, Prisma.FileUncheckedUpdateManyInput>;
    /**
     * Filter which Files to update
     */
    where?: Prisma.FileWhereInput;
    /**
     * Limit how many Files to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * File upsert
 */
export type FileUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * The filter to search for the File to update in case it exists.
     */
    where: Prisma.FileWhereUniqueInput;
    /**
     * In case the File found by the `where` argument doesn't exist, create a new File with this data.
     */
    create: Prisma.XOR<Prisma.FileCreateInput, Prisma.FileUncheckedCreateInput>;
    /**
     * In case the File was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.FileUpdateInput, Prisma.FileUncheckedUpdateInput>;
};
/**
 * File delete
 */
export type FileDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
    /**
     * Filter which File to delete.
     */
    where: Prisma.FileWhereUniqueInput;
};
/**
 * File deleteMany
 */
export type FileDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Files to delete
     */
    where?: Prisma.FileWhereInput;
    /**
     * Limit how many Files to delete.
     */
    limit?: number;
};
/**
 * File.folder
 */
export type File$folderArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Folder
     */
    select?: Prisma.FolderSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Folder
     */
    omit?: Prisma.FolderOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FolderInclude<ExtArgs> | null;
    where?: Prisma.FolderWhereInput;
};
/**
 * File.canvas
 */
export type File$canvasArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
    where?: Prisma.CanvasSnapshotWhereInput;
};
/**
 * File.document
 */
export type File$documentArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentSnapshot
     */
    select?: Prisma.DocumentSnapshotSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the DocumentSnapshot
     */
    omit?: Prisma.DocumentSnapshotOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.DocumentSnapshotInclude<ExtArgs> | null;
    where?: Prisma.DocumentSnapshotWhereInput;
};
/**
 * File without action
 */
export type FileDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: Prisma.FileSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the File
     */
    omit?: Prisma.FileOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.FileInclude<ExtArgs> | null;
};
//# sourceMappingURL=File.d.ts.map