using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace NetWorthNavigator.Backend.Tests;

public class LedgerApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public LedgerApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Delete_NonExistentId_Returns404()
    {
        var response = await _client.DeleteAsync("/api/ledger/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/ledger");
        response.EnsureSuccessStatusCode();
        var list = await response.Content.ReadFromJsonAsync<List<LedgerAccountDto>>();
        Assert.NotNull(list);
    }

    [Fact]
    public async Task Create_Then_Delete_Returns204_And_RemovesAccount()
    {
        // Ensure we have an account structure (seed runs on first request). Get account classes first.
        var classesResponse = await _client.GetAsync("/api/accountstructure/account-classes");
        classesResponse.EnsureSuccessStatusCode();
        var classes = await classesResponse.Content.ReadFromJsonAsync<List<AccountClassDto>>();
        Assert.NotNull(classes);
        var firstClass = classes.FirstOrDefault();
        if (firstClass == null)
            return; // no structure seeded, skip

        var createDto = new { accountStructureId = firstClass.Id, code = "9999", name = "Test account to delete" };
        var createResponse = await _client.PostAsJsonAsync("/api/ledger", createDto);
        Assert.True(createResponse.IsSuccessStatusCode, "Create should succeed. Status: " + createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<LedgerAccountDto>();
        Assert.NotNull(created);

        var deleteResponse = await _client.DeleteAsync("/api/ledger/" + created.Id);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await _client.GetAsync("/api/ledger");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadFromJsonAsync<List<LedgerAccountDto>>();
        Assert.NotNull(list);
        Assert.DoesNotContain(list, x => x.Id == created.Id);
    }

    private sealed class LedgerAccountDto
    {
        public int Id { get; set; }
        public int AccountStructureId { get; set; }
        public string AccountStructureName { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public int SortOrder { get; set; }
    }

    private sealed class AccountClassDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
    }
}
