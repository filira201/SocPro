import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useCreatePostMutation } from "../api/posts.api";
import type { Post } from "../model/types";

import { PostComposer } from "./post-composer";

import "@/features/posts/api/posts.api";
import { renderWithProviders } from "@/shared/lib/test/render-with-providers";

const mockCreatePost = vi.fn();

vi.mock("../api/posts.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts.api")>();

  return {
    ...actual,
    useCreatePostMutation: vi.fn(),
  };
});

const mockedUseCreatePostMutation = vi.mocked(useCreatePostMutation);

function makeCreatedPost(content: string): Post {
  return {
    id: "6a04cae90445f0b3a1d3861a",
    content,
    authorId: "507f1f77bcf86cd799439011",
    author: {
      id: "507f1f77bcf86cd799439011",
      email: "author@example.com",
      firstName: "Иван",
      lastName: "Иванов",
      patronymic: null,
      avatarUrl: null,
      bio: null,
      dateOfBirth: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    attachments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    likeCount: 0,
    commentCount: 0,
    likedByUser: false,
    isOwner: true,
    isEdited: false,
  };
}

function mockCreatePostIdle() {
  mockedUseCreatePostMutation.mockReturnValue([
    mockCreatePost,
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useCreatePostMutation>);
}

function mockCreatePostSuccess() {
  mockedUseCreatePostMutation.mockReturnValue([
    mockCreatePost.mockReturnValue({
      unwrap: () => Promise.resolve(makeCreatedPost("Новый текст")),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useCreatePostMutation>);
}

function mockCreatePostFailure(message: string) {
  mockedUseCreatePostMutation.mockReturnValue([
    mockCreatePost.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { error: message },
        }),
    }),
    { isLoading: false, reset: vi.fn() },
  ] as ReturnType<typeof useCreatePostMutation>);
}

describe("PostComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePostIdle();
  });

  test("не публикует пустой пост без файлов", async () => {
    // Arrange
    const { user } = renderWithProviders(<PostComposer />);

    // Act
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));

    // Assert
    expect(screen.getByText("Добавьте текст или файл")).toBeInTheDocument();
    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  test("публикует пост с текстом и очищает форму", async () => {
    // Arrange
    mockCreatePostSuccess();
    const { user } = renderWithProviders(<PostComposer />);

    // Act
    await user.type(screen.getByLabelText("Новый пост"), "Новый текст");
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));

    // Assert
    await vi.waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledTimes(1);
    });
    const formData = mockCreatePost.mock.calls[0]?.[0] as FormData;
    expect(formData.get("content")).toBe("Новый текст");
    expect(screen.getByLabelText("Новый пост")).toHaveValue("");
  });

  test("показывает ошибку API при неудачной публикации", async () => {
    // Arrange
    mockCreatePostFailure("Не удалось сохранить пост на сервере");
    const { user } = renderWithProviders(<PostComposer />);

    // Act
    await user.type(screen.getByLabelText("Новый пост"), "Текст");
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));

    // Assert
    expect(
      await screen.findByText("Не удалось сохранить пост на сервере")
    ).toBeInTheDocument();
  });
});
