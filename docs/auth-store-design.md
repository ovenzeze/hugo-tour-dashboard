# 用户鉴权 Pinia Store 设计方案 (适用于 Nuxt 3 项目)

## 研究发现总结:

1.  **shadcn/vue 的定位:** shadcn/vue 主要提供高质量、可定制的 UI 组件，包括用于登录和注册的表单组件。它本身不包含用户鉴权的状态管理或与后端 API 交互的逻辑。这些需要开发者根据自己的项目需求进行实现。
2.  **与前端框架结合:** shadcn/vue 的组件是基于 Vue 3 构建的，可以与任何 Vue 3 框架（包括 Nuxt 3）结合使用。在 Nuxt 3 中，可以将 shadcn/vue 组件集成到页面或布局中，并结合 Nuxt 3 的特性（如自动导入、文件路由等）进行开发。用户鉴权的核心逻辑（如 API 调用、状态管理）需要单独实现。
3.  **Nuxt 3 中的状态管理:** Pinia 是 Nuxt 3 官方推荐的状态管理库，与 Vuex 相比更轻量且易于使用。Pinia 支持在 Nuxt 3 中进行服务器端渲染 (SSR) 的状态同步，并且可以通过插件实现状态持久化，这对于用户鉴权状态的管理非常重要（例如，在页面刷新后保持登录状态）。

## Pinia Store 设计方案:

基于以上研究，我设计了一个名为 `auth` 的 Pinia Store，用于管理用户鉴权相关的状态。

**Store 名称:** `auth`

**State:**

*   `user`: 存储当前登录用户的信息。可以是 `null`（未登录）或一个包含用户详细信息的对象（例如 `{ id: string, name: string, email: string, ... }`）。
*   `token`: 存储用户的认证 token。可以是 `null`（未登录）或一个字符串。这个 token 将用于后续需要认证的 API 请求。
*   `isLoggedIn`: 一个布尔值，表示用户是否已登录。可以通过 `user` 或 `token` 的状态派生，但显式存储可以方便快速访问。
*   `authStatus`: 存储当前的认证状态，例如 `'idle'`, `'loading'`, `'success'`, `'error'`。用于在 UI 中显示加载状态或错误信息。
*   `authError`: 存储认证过程中发生的错误信息，例如登录失败的原因。

**Getters:**

*   `isAuthenticated`: 返回 `true` 如果用户已登录 (`isLoggedIn` 为 `true`)，否则返回 `false`。
*   `currentUser`: 返回当前用户对象 (`user`)。
*   `authToken`: 返回认证 token (`token`)。
*   `isLoading`: 返回 `true` 如果 `authStatus` 是 `'loading'`，否则返回 `false`。
*   `hasError`: 返回 `true` 如果 `authStatus` 是 `'error'` 且 `authError` 不为空，否则返回 `false`。

**Actions:**

*   `login(credentials)`: 接收用户凭据（如邮箱、密码），调用后端登录 API。成功后，更新 `user` 和 `token` 状态，设置 `isLoggedIn` 为 `true`，并设置 `authStatus` 为 `'success'`。失败时，设置 `authStatus` 为 `'error'` 并存储错误信息到 `authError`。
*   `register(userData)`: 接收用户注册数据，调用后端注册 API。成功后，可以根据后端返回决定是否直接登录或跳转到登录页面。更新相关状态并设置 `authStatus`。
*   `logout()`: 调用后端登出 API（如果需要），清除 `user` 和 `token` 状态，设置 `isLoggedIn` 为 `false`，并重置 `authStatus` 和 `authError`。
*   `checkAuth()`: 在应用初始化或页面刷新时调用，检查用户是否已认证（例如，检查本地存储中的 token 是否有效），并更新 `user`、`token` 和 `isLoggedIn` 状态。这对于 Nuxt 3 的 SSR 和状态持久化非常重要。
*   `clearAuthError()`: 清除 `authError` 和将 `authStatus` 设置回 `'idle'`。

**Nuxt 3 特性考虑:**

*   **状态持久化:** 结合 `pinia-plugin-persistedstate/nuxt` 插件，可以将 `token` 和部分 `user` 信息存储在本地存储（如 localStorage 或 cookie）中，以便在页面刷新后恢复登录状态。
*   **服务器端渲染 (SSR):** 在 Nuxt 3 中，Pinia Store 的状态可以在服务器端预取并在客户端 Hydration 时同步。`checkAuth` action 可以在 Nuxt 插件或中间件中调用，以便在服务器端或客户端初始化时检查认证状态。敏感信息（如 token）需要谨慎处理，考虑使用 cookie 并设置 `httpOnly` 标志以提高安全性。
*   **中间件:** 可以创建 Nuxt 路由中间件来保护需要认证的路由，检查 Pinia Store 中的 `isLoggedIn` 状态，如果未登录则重定向到登录页面。