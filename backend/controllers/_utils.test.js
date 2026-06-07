const {
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
} = require("../lib/field-limits");

const {
  decodeUploadOriginalName,
  displayPublicName,
  sanitizeOwnUser,
  sanitizeUser,
  validateFioPart,
  validateLogin,
  validateRegister,
} = require("./_utils");

const VALID_REGISTER = {
  email: "new@example.com",
  password: "secret1",
  firstName: "Иван",
  personalDataConsent: true,
};

describe("validateRegister", () => {
  test("возвращает null для корректных данных", () => {
    // Act
    const error = validateRegister(VALID_REGISTER);

    // Assert
    expect(error).toBeNull();
  });

  test("возвращает ошибку при пустой почте", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, email: "" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Некорректная почта");
  });

  test("возвращает ошибку при некорректной почте", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, email: "not-an-email" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Некорректная почта");
  });

  test("возвращает ошибку если почта длиннее лимита", () => {
    // Arrange
    const longEmail = `${"a".repeat(USER_EMAIL_MAX - 11)}@example.com`;

    // Act
    const error = validateRegister({ ...VALID_REGISTER, email: longEmail });

    // Assert
    expect(error).toBe(
      `Почта слишком длинная (не более ${USER_EMAIL_MAX} символов)`,
    );
  });

  test("возвращает ошибку если пароль короче 6 символов", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, password: "12345" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Пароль минимум 6 символов");
  });

  test("возвращает ошибку если пароль длиннее лимита", () => {
    // Arrange
    const longPassword = "a".repeat(USER_PASSWORD_MAX + 1);

    // Act
    const error = validateRegister({
      ...VALID_REGISTER,
      password: longPassword,
    });

    // Assert
    expect(error).toBe(
      `Пароль слишком длинный (не более ${USER_PASSWORD_MAX} символов)`,
    );
  });

  test("требует согласие на обработку персональных данных", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, personalDataConsent: false };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Необходимо согласие на обработку персональных данных");
  });

  test("требует имя", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, firstName: "" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Имя: поле обязательно");
  });

  test("отклоняет латиницу в имени", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, firstName: "Ivan" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe("Имя: только кириллица, без пробелов и других символов");
  });

  test("возвращает ошибку если имя длиннее лимита", () => {
    // Arrange
    const payload = {
      ...VALID_REGISTER,
      firstName: "а".repeat(USER_FIO_PART_MAX + 1),
    };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe(
      `Имя слишком длинное (не более ${USER_FIO_PART_MAX} символов)`,
    );
  });

  test("принимает пустую фамилию", () => {
    // Act
    const error = validateRegister({ ...VALID_REGISTER, lastName: "" });

    // Assert
    expect(error).toBeNull();
  });

  test("отклоняет латиницу в фамилии", () => {
    // Arrange
    const payload = { ...VALID_REGISTER, lastName: "Ivanov" };

    // Act
    const error = validateRegister(payload);

    // Assert
    expect(error).toBe(
      "Фамилия: только кириллица, без пробелов и других символов",
    );
  });

  test("принимает кириллическое отчество", () => {
    // Act
    const error = validateRegister({
      ...VALID_REGISTER,
      patronymic: "Иванович",
    });

    // Assert
    expect(error).toBeNull();
  });
});

describe("validateLogin", () => {
  test("возвращает null для корректных данных", () => {
    // Act
    const error = validateLogin({
      email: "user@example.com",
      password: "secret1",
    });

    // Assert
    expect(error).toBeNull();
  });

  test("возвращает ошибку при пустой почте", () => {
    // Act
    const error = validateLogin({ email: "", password: "secret1" });

    // Assert
    expect(error).toBe("Некорректная почта");
  });

  test("возвращает ошибку если почта длиннее лимита", () => {
    // Arrange
    const longEmail = `${"a".repeat(USER_EMAIL_MAX - 11)}@example.com`;

    // Act
    const error = validateLogin({ email: longEmail, password: "secret1" });

    // Assert
    expect(error).toBe(
      `Почта слишком длинная (не более ${USER_EMAIL_MAX} символов)`,
    );
  });

  test("возвращает ошибку при пустом пароле", () => {
    // Act
    const error = validateLogin({ email: "user@example.com", password: "" });

    // Assert
    expect(error).toBe("Введите пароль");
  });

  test("возвращает ошибку если пароль длиннее лимита", () => {
    // Arrange
    const longPassword = "a".repeat(USER_PASSWORD_MAX + 1);

    // Act
    const error = validateLogin({
      email: "user@example.com",
      password: longPassword,
    });

    // Assert
    expect(error).toBe(
      `Пароль слишком длинный (не более ${USER_PASSWORD_MAX} символов)`,
    );
  });
});

describe("validateFioPart", () => {
  test("пропускает отсутствие опционального поля", () => {
    // Act
    const error = validateFioPart(undefined, {
      optional: true,
      label: "Фамилия",
    });

    // Assert
    expect(error).toBeNull();
  });
});

describe("sanitizeUser", () => {
  test("удаляет password и email на корневом объекте", () => {
    // Arrange
    const user = {
      id: "1",
      email: "secret@example.com",
      password: "hash",
      firstName: "Иван",
    };

    // Act
    const result = sanitizeUser(user);

    // Assert
    expect(result).toEqual({ id: "1", firstName: "Иван" });
    expect(result.password).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  test("рекурсивно очищает вложенных пользователей", () => {
    // Arrange
    const data = {
      author: {
        id: "1",
        email: "a@example.com",
        password: "hash",
        firstName: "Иван",
      },
    };

    // Act
    const result = sanitizeUser(data);

    // Assert
    expect(result.author).toEqual({ id: "1", firstName: "Иван" });
  });

  test("обрабатывает массивы", () => {
    // Arrange
    const items = [
      { id: "1", email: "a@example.com", password: "hash" },
      { id: "2", email: "b@example.com", password: "hash" },
    ];

    // Act
    const result = sanitizeUser(items);

    // Assert
    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });
});

describe("sanitizeOwnUser", () => {
  test("возвращает email на корневом объекте текущего пользователя", () => {
    // Arrange
    const user = {
      id: "1",
      email: "me@example.com",
      password: "hash",
      firstName: "Иван",
    };

    // Act
    const result = sanitizeOwnUser(user);

    // Assert
    expect(result).toEqual({
      id: "1",
      email: "me@example.com",
      firstName: "Иван",
    });
  });
});

describe("displayPublicName", () => {
  test("возвращает «Имя Фамилия»", () => {
    // Act
    const name = displayPublicName({
      firstName: "Иван",
      lastName: "Петров",
    });

    // Assert
    expect(name).toBe("Иван Петров");
  });

  test("возвращает только имя если фамилия отсутствует", () => {
    // Act
    const name = displayPublicName({ firstName: "Иван" });

    // Assert
    expect(name).toBe("Иван");
  });

  test("возвращает пустую строку для некорректного ввода", () => {
    // Act & Assert
    expect(displayPublicName(null)).toBe("");
    expect(displayPublicName(undefined)).toBe("");
  });
});

describe("decodeUploadOriginalName", () => {
  test("возвращает пустую строку для пустого значения", () => {
    // Act & Assert
    expect(decodeUploadOriginalName("")).toBe("");
    expect(decodeUploadOriginalName(null)).toBe("");
  });

  test("декодирует имя файла из latin1 в utf8", () => {
    // Arrange — «файл.pdf» в UTF-8, переданное как latin1
    const latin1Name = Buffer.from("файл.pdf", "utf8").toString("latin1");

    // Act
    const result = decodeUploadOriginalName(latin1Name);

    // Assert
    expect(result).toBe("файл.pdf");
  });
});
