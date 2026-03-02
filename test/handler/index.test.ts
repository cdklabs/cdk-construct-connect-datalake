// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { handler } from "@src/handler";
import { onCreateUpdate } from "@src/handler/on-event/on-create-update";
import { onDelete } from "@src/handler/on-event/on-delete";

jest.mock("@src/handler/on-event/on-create-update");
jest.mock("@src/handler/on-event/on-delete");
jest.mock("aws-sdk", () => ({
  Lambda: jest.fn(() => ({
    getFunctionConfiguration: jest
      .fn()
      .mockReturnValue({ promise: () => Promise.resolve({ Environment: { Variables: {} } }) }),
    updateFunctionConfiguration: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
  })),
}));

const mockOnCreateUpdate = onCreateUpdate as jest.MockedFunction<typeof onCreateUpdate>;
const mockOnDelete = onDelete as jest.MockedFunction<typeof onDelete>;

describe("Lambda Handler", () => {
  const mockContext = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCreateUpdate.mockResolvedValue({
      Status: "SUCCESS",
      Data: { errors: "" },
    });
    mockOnDelete.mockResolvedValue({ Status: "SUCCESS", Data: { errors: "" } });
  });

  it("routes Create to onCreateUpdate", async () => {
    await handler({ RequestType: "Create" } as any, mockContext);
    expect(mockOnCreateUpdate).toHaveBeenCalledTimes(1);
  });

  it("routes Update to onCreateUpdate", async () => {
    await handler({ RequestType: "Update" } as any, mockContext);
    expect(mockOnCreateUpdate).toHaveBeenCalledTimes(1);
  });

  it("routes Delete to onDelete", async () => {
    await handler({ RequestType: "Delete" } as any, mockContext);
    expect(mockOnDelete).toHaveBeenCalled();
  });
});
